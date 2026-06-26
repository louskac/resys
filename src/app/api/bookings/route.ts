import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { makeErrorResponse } from "@/lib/errors";
import { triggerBookingUpdate } from "@/lib/pusher";
import { sendSSEUpdate } from "@/lib/sse";
import crypto from "crypto";
import { calculateLightingSurcharge } from "@/lib/pricing";

const getLocalAsUtcDate = (d: Date, timeZone: string = "Europe/Prague"): Date => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    
    let year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0;
    for (const part of parts) {
      if (part.type === "year") year = parseInt(part.value, 10);
      else if (part.type === "month") month = parseInt(part.value, 10);
      else if (part.type === "day") day = parseInt(part.value, 10);
      else if (part.type === "hour") hour = parseInt(part.value, 10);
      else if (part.type === "minute") minute = parseInt(part.value, 10);
      else if (part.type === "second") second = parseInt(part.value, 10);
    }
    
    if (hour === 24) hour = 0;
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  } catch (e) {
    console.error(`Failed to parse ${timeZone} timezone offset, falling back to UTC+1/2 offset`, e);
    return new Date(d.getTime() + (timeZone === "Europe/Prague" || timeZone === "Europe/London" ? 2 : 0) * 60 * 60 * 1000);
  }
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { 
      tenantId, 
      scheduleRuleId, 
      resourceId, 
      dayIndex, 
      startTime, 
      endTime, 
      guestName, 
      guestEmail,
      weekStart,
      recurrencePattern,
      recurrenceCount,
      partnerId,
      rentedEquipment
    } = body;

    if (!tenantId || dayIndex === undefined) {
      return makeErrorResponse("MISSING_PARAMETER", "Chybí povinný identifikátor poskytovatele (tenantId) nebo index dne (dayIndex).");
    }

    if (typeof dayIndex !== "number" || dayIndex < 0 || dayIndex > 6) {
      return makeErrorResponse("INVALID_DAY_INDEX", "Index dne musí být číslo mezi 0 (pondělí) a 6 (neděle).");
    }

    let userName = "";
    let userEmail = "";
    let oneidUserId = "";
    let isUserAdmin = false;

    if (session && session.user) {
      const activeUserEmail = session.user.email || "";
      // Fetch tenant from db to check admin emails
      const tenantObj = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { attributes: true },
      });
      if (tenantObj) {
        const adminEmails = (tenantObj.attributes as any)?.adminEmails || [];
        const userRole = (session.user as any).role;
        const userTenantId = (session.user as any).tenantId;
        isUserAdmin = 
          (userRole === "ADMIN" && userTenantId === tenantId) ||
          adminEmails.includes(activeUserEmail);
      }
    }

    if (session && session.user && (!isUserAdmin || !guestName || !guestEmail)) {
      userName = session.user.name || "Unknown User";
      userEmail = session.user.email || "unknown@domain.com";
      oneidUserId = (session.user as any).id || "unknown";
    } else {
      if (!guestName || !guestEmail) {
        return makeErrorResponse("MISSING_PARAMETER", "Pro dokončení rezervace jako host zadejte prosím své jméno a e-mail.");
      }
      userName = guestName;
      userEmail = guestEmail;
      oneidUserId = isUserAdmin ? "admin_booking" : "guest";
    }

    // Reference week date calculations
    const startOfWeek = new Date(`${weekStart || "2026-06-08"}T00:00:00.000Z`);
    const targetDate = new Date(startOfWeek);
    targetDate.setUTCDate(startOfWeek.getUTCDate() + dayIndex);

    try {
      const result = await prisma.$transaction(async (tx) => {
        let finalResourceId = resourceId;
        let rule: any = null;
        let tenant: any = null;

        let partner = null;
        let finalPartnerId = partnerId;

        // Enforce subscription plan checks: block booking if canceled or past_due
        const dbTenant = await tx.tenant.findUnique({
          where: { id: tenantId }
        });
        if (!dbTenant) {
          throw new Error("TENANT_NOT_FOUND");
        }
        if (dbTenant.subscriptionStatus === "CANCELED" || dbTenant.subscriptionStatus === "PAST_DUE") {
          throw new Error(`SUBSCRIPTION_INACTIVE:${dbTenant.subscriptionStatus}`);
        }

        // If no explicit partnerId is provided, check if the booking user is linked to a partner
        if (!finalPartnerId && userEmail) {
          const dbUser = await tx.user.findFirst({
            where: { email: userEmail, tenantId }
          });
          if (dbUser?.partnerId) {
            finalPartnerId = dbUser.partnerId;
          }
        }

        if (finalPartnerId) {
          partner = await tx.partner.findFirst({
            where: { id: finalPartnerId, tenantId, active: true }
          });
        }

        if (scheduleRuleId) {
          // --- Case A: Booking a pre-configured program slot / class ---
          rule = await tx.scheduleRule.findUnique({
            where: { id: scheduleRuleId },
            include: { resource: true },
          });

          if (!rule || rule.resource.tenantId !== tenantId) {
            throw new Error("SCHEDULE_RULE_NOT_FOUND");
          }

          finalResourceId = rule.resourceId;
        } else {
          // --- Case B: Booking an ad-hoc custom time slot (e.g. sport field rental) ---
          if (!resourceId || !startTime || !endTime) {
            throw new Error("MISSING_PARAMETER");
          }

          tenant = await tx.tenant.findUnique({
            where: { id: tenantId },
            include: { 
              resources: {
                include: {
                  scheduleRules: true
                }
              }
            },
          });

          if (!tenant) {
            throw new Error("TENANT_NOT_FOUND");
          }

          const resource = tenant.resources.find((r: any) => r.id === resourceId);
          if (!resource) {
            throw new Error("RESOURCE_NOT_FOUND");
          }

          // Validate time string formats
          const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            throw new Error("INVALID_TIME_FORMAT");
          }

          // Validate operating hours (support resource-specific rules and parent branch inheritance)
          const attrs = (tenant.attributes as any) || {};

          const getActiveRulesForResource = (resId: string): any[] => {
            const res = tenant.resources.find((r: any) => r.id === resId);
            if (!res) return [];
            if (res.scheduleRules && res.scheduleRules.length > 0) {
              return res.scheduleRules;
            }
            const pId = (res.attributes as any)?.parentId;
            if (pId) {
              return getActiveRulesForResource(pId);
            }
            return [];
          };

          const activeRules = getActiveRulesForResource(resourceId);

          if (activeRules.length > 0) {
            // Validate against resource-specific rules
            const utcDay = targetDate.getUTCDay(); // 0 (Sunday) to 6 (Saturday)
            const dayRules = activeRules.filter((r: any) => r.dayOfWeek === utcDay);
            if (dayRules.length === 0) {
              throw new Error("OPERATING_HOURS_EXCEEDED"); // Closed on this day
            }
            
            const [startH, startM] = startTime.split(":").map(Number);
            const [endH, endM] = endTime.split(":").map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            // Must fall completely within at least one rule range for this day
            const fits = dayRules.some((rule: any) => {
              const [openH, openM] = rule.startTime.split(":").map(Number);
              const [closeH, closeM] = rule.endTime.split(":").map(Number);
              const openMinutes = openH * 60 + openM;
              const closeMinutes = closeH * 60 + closeM;
              return startMinutes >= openMinutes && endMinutes <= closeMinutes;
            });

            if (!fits) {
              let minOpen = "08:00";
              let maxClose = "18:00";
              let minMinutes = 24 * 60;
              let maxMinutes = 0;
              dayRules.forEach((rule: any) => {
                const [oh, om] = rule.startTime.split(":").map(Number);
                const [ch, cm] = rule.endTime.split(":").map(Number);
                const openVal = oh * 60 + om;
                const closeVal = ch * 60 + cm;
                if (openVal < minMinutes) {
                  minMinutes = openVal;
                  minOpen = rule.startTime;
                }
                if (closeVal > maxMinutes) {
                  maxMinutes = closeVal;
                  maxClose = rule.endTime;
                }
              });
              throw new Error(`OPERATING_HOURS_EXCEEDED:${minOpen}:${maxClose}`);
            }
          } else {
            // Default fallback validation against global tenant operating hours
            const openingHours = attrs.openingHours || [];
            let openTime = attrs.openTime || "08:00";
            let closeTime = attrs.closeTime || "18:00";
            let closed = false;

            if (openingHours.length > 0) {
              const utcDay = targetDate.getUTCDay();
              const dayData = openingHours.find((d: any) => d.dayOfWeek === utcDay);
              if (dayData) {
                openTime = dayData.openTime;
                closeTime = dayData.closeTime;
                closed = dayData.closed;
              }
            }

            if (closed) {
              throw new Error("OPERATING_HOURS_EXCEEDED");
            }

            const [openH, openM] = openTime.split(":").map(Number);
            const [closeH, closeM] = closeTime.split(":").map(Number);
            const openMinutes = openH * 60 + openM;
            const closeMinutes = closeH * 60 + closeM;

            const [startH, startM] = startTime.split(":").map(Number);
            const [endH, endM] = endTime.split(":").map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            if (startMinutes < openMinutes || endMinutes > closeMinutes) {
              throw new Error(`OPERATING_HOURS_EXCEEDED:${openTime}:${closeTime}`);
            }
          }
        }

        const count = recurrencePattern && recurrencePattern !== "none" ? Math.max(1, recurrenceCount || 1) : 1;
        const recurrenceGroup = count > 1 ? crypto.randomUUID() : null;
        let createdBookingId = "";

        // Calculate conflicting resource IDs if custom booking
        let conflictingResourceIds: string[] = [];
        if (!scheduleRuleId && tenant) {
          const tenantResources = tenant.resources;
          const getAncestors = (id: string): string[] => {
            const res = tenantResources.find((r: any) => r.id === id);
            const parentId = (res?.attributes as any)?.parentId;
            if (!parentId) return [];
            return [parentId, ...getAncestors(parentId)];
          };

          const getDescendants = (id: string): string[] => {
            const children = tenantResources.filter((r: any) => (r.attributes as any)?.parentId === id);
            const childIds = children.map((c: any) => c.id);
            const grandchildIds = childIds.flatMap((cid: any) => getDescendants(cid));
            return [...childIds, ...grandchildIds];
          };

          conflictingResourceIds = [
            resourceId,
            ...getAncestors(resourceId),
            ...getDescendants(resourceId),
          ];
        }

        for (let i = 0; i < count; i++) {
          const occTargetDate = new Date(targetDate);
          const occStartOfWeek = new Date(startOfWeek);
          
          if (recurrencePattern === "weekly") {
            occTargetDate.setUTCDate(targetDate.getUTCDate() + i * 7);
            occStartOfWeek.setUTCDate(startOfWeek.getUTCDate() + i * 7);
          } else if (recurrencePattern === "bi-weekly") {
            occTargetDate.setUTCDate(targetDate.getUTCDate() + i * 14);
            occStartOfWeek.setUTCDate(startOfWeek.getUTCDate() + i * 14);
          } else if (recurrencePattern === "monthly") {
            occTargetDate.setUTCMonth(targetDate.getUTCMonth() + i);
            occStartOfWeek.setUTCMonth(startOfWeek.getUTCMonth() + i);
          }

          let reservedFrom: Date;
          let reservedTo: Date;

          if (scheduleRuleId && rule) {
            const [startHourStr, startMinStr] = rule.startTime.split(":");
            const [endHourStr, endMinStr] = rule.endTime.split(":");

            reservedFrom = new Date(occTargetDate);
            reservedFrom.setUTCHours(parseInt(startHourStr, 10), parseInt(startMinStr, 10), 0, 0);

            reservedTo = new Date(occTargetDate);
            reservedTo.setUTCHours(parseInt(endHourStr, 10), parseInt(endMinStr, 10), 0, 0);

            // Capacity check
            const midnightOcc = new Date(occTargetDate);
            midnightOcc.setUTCHours(0, 0, 0, 0);
            const endOfDayOcc = new Date(occTargetDate);
            endOfDayOcc.setUTCHours(23, 59, 59, 999);

            const confirmedCount = await tx.booking.count({
              where: {
                scheduleRuleId,
                status: { in: ["CONFIRMED", "PENDING_PAYMENT", "ATTENDED"] },
                reservedFrom: {
                  gte: midnightOcc,
                  lte: endOfDayOcc,
                },
              },
            });

            if (confirmedCount >= rule.maxCapacity) {
              const formattedDate = occTargetDate.toISOString().split("T")[0];
              throw new Error(`CAPACITY_EXCEEDED:${formattedDate}`);
            }
          } else {
            const [startHourStr, startMinStr] = startTime.split(":");
            const [endHourStr, endMinStr] = endTime.split(":");

            reservedFrom = new Date(occTargetDate);
            reservedFrom.setUTCHours(parseInt(startHourStr, 10), parseInt(startMinStr, 10), 0, 0);

            reservedTo = new Date(occTargetDate);
            reservedTo.setUTCHours(parseInt(endHourStr, 10), parseInt(endMinStr, 10), 0, 0);

             if (reservedFrom >= reservedTo) {
              throw new Error("INVALID_TIME_RANGE");
            }

            // Check for overlapping bookings on conflicting resources, respecting technical breaks
            const possibleOverlapping = await tx.booking.findMany({
              where: {
                resourceId: { in: conflictingResourceIds },
                status: { in: ["CONFIRMED", "PENDING_PAYMENT", "ATTENDED"] },
                reservedFrom: { lt: new Date(reservedTo.getTime() + 24 * 60 * 60 * 1000) },
                reservedTo: { gt: new Date(reservedFrom.getTime() - 24 * 60 * 60 * 1000) },
              },
            });

            const getBreakMinutes = (rId: string): number => {
              const res = tenant.resources.find((r: any) => r.id === rId);
              if (!res) return 0;
              const attrs = (res.attributes as any) || {};
              if (attrs.technicalBreak) {
                return parseInt(attrs.technicalBreakMinutes, 10) || 0;
              }
              return 0;
            };

            const targetBreak = getBreakMinutes(finalResourceId);
            const newStart = reservedFrom.getTime();
            const newEnd = reservedTo.getTime();
            const newBreakMs = targetBreak * 60 * 1000;

            const overlapping = possibleOverlapping.find((b: any) => {
              const existStart = b.reservedFrom.getTime();
              const existEnd = b.reservedTo.getTime();
              const existBreakMs = getBreakMinutes(b.resourceId) * 60 * 1000;
              return newStart < existEnd + existBreakMs && existStart < newEnd + newBreakMs;
            });

            if (overlapping) {
              const formattedDate = occTargetDate.toISOString().split("T")[0];
              const isStandardOverlap = newStart < overlapping.reservedTo.getTime() && overlapping.reservedFrom.getTime() < newEnd;
              if (isStandardOverlap) {
                throw new Error(`OVERLAP_CONFLICT:${formattedDate}`);
              } else {
                throw new Error(`TECHNICAL_BREAK_CONFLICT:${formattedDate}`);
              }
            }
          }

          // Check for schedule exceptions (closures) overlapping this booking slot
          const exceptionConflictFilter = !scheduleRuleId
            ? {
                OR: [
                  { resourceId: null },
                  { resourceId: { in: conflictingResourceIds } }
                ]
              }
            : {
                OR: [
                  { resourceId: null },
                  { resourceId: finalResourceId }
                ]
              };

          const conflictingExceptions = await tx.scheduleException.findMany({
            where: {
              tenantId,
              ...exceptionConflictFilter,
              dateFrom: { lt: reservedTo },
              dateTo: { gt: reservedFrom }
            }
          });

          if (conflictingExceptions.length > 0) {
            const exc = conflictingExceptions[0];
            throw new Error(`CLOSURE_EXCEPTION:${exc.name}`);
          }

          // --- Validate that the booking is not in the past ---
          if (reservedFrom < getLocalAsUtcDate(new Date(), dbTenant.timezone)) {
            throw new Error("PAST_BOOKING_NOT_ALLOWED");
          }

          // --- Validate Rented Equipment Availability & Cooldown ---
          if (Array.isArray(rentedEquipment) && rentedEquipment.length > 0) {
            const resource = tenant.resources.find((r: any) => r.id === finalResourceId);
            const equipList = (resource?.attributes as any)?.equipmentList || [];
            
            for (const reqEq of rentedEquipment) {
              const eqConfig = equipList.find((e: any) => e.id === reqEq.id);
              if (!eqConfig) {
                throw new Error("INVALID_EQUIPMENT");
              }
              
              if (eqConfig.category === "extra") {
                const cooldownMin = Number(eqConfig.cooldownMinutes) || 0;
                
                // Query database for overlapping bookings to check quantity limits
                const overlappingRentals = await tx.booking.findMany({
                  where: {
                    resourceId: { in: conflictingResourceIds },
                    status: { in: ["CONFIRMED", "PENDING_PAYMENT", "ATTENDED"] },
                    reservedFrom: { lt: reservedTo },
                    reservedTo: { gt: new Date(reservedFrom.getTime() - 7 * 24 * 60 * 60 * 1000) } // 7-day lookback for long cooldowns
                  }
                });
                
                let currentRentedQty = 0;
                overlappingRentals.forEach((b: any) => {
                  if (!b.rentedEquipment) return;
                  let eqRentalsList = [];
                  try {
                    eqRentalsList = typeof b.rentedEquipment === "string" ? JSON.parse(b.rentedEquipment) : b.rentedEquipment;
                  } catch (e) {
                    return;
                  }
                  if (!Array.isArray(eqRentalsList)) return;
                  
                  const rentedItem = eqRentalsList.find((rItem: any) => rItem.id === reqEq.id);
                  if (!rentedItem || !rentedItem.quantity) return;
                  
                  const bStart = b.reservedFrom.getTime();
                  const bEnd = b.reservedTo.getTime();
                  const blockedEnd = bEnd + cooldownMin * 60 * 1000;
                  
                  const targetStart = reservedFrom.getTime();
                  const targetEnd = reservedTo.getTime();
                  
                  if (bStart < targetEnd && blockedEnd > targetStart) {
                    currentRentedQty += Number(rentedItem.quantity) || 0;
                  }
                });
                
                if (currentRentedQty + (Number(reqEq.quantity) || 0) > (Number(eqConfig.quantity) || 0)) {
                  throw new Error(`EQUIPMENT_CAPACITY_EXCEEDED:${eqConfig.name}`);
                }
              }
            }
          }

          // --- Calculate Price ---
          let basePrice = 0.00;
          if (scheduleRuleId && rule) {
            basePrice = Number(rule.price) || 0;
          } else {
            // Case B resource details
            const resource = tenant.resources.find((r: any) => r.id === finalResourceId);
            const hourlyRate = Number((resource?.attributes as any)?.price) || 0;
            const durationHours = (reservedTo.getTime() - reservedFrom.getTime()) / (1000 * 60 * 60);
            basePrice = hourlyRate * durationHours;
          }

          if (partner) {
            basePrice = basePrice * (1 - (partner.discount || 0) / 100);
          }

          // Add flat equipment cost (not subject to partner discount)
          let equipmentCost = 0;
          if (Array.isArray(rentedEquipment)) {
            rentedEquipment.forEach((reqEq: any) => {
              if (reqEq.category === "extra") {
                equipmentCost += (Number(reqEq.price) || 0) * (Number(reqEq.quantity) || 0);
              }
            });
          }

          // Calculate automatic lighting surcharge (not subject to partner discount)
          let lightingSurcharge = 0;
          const resource = tenant.resources.find((r: any) => r.id === finalResourceId);
          if (resource) {
            const resAttrs = (resource.attributes as any) || {};
            if (resAttrs.autoLightingPricingEnabled) {
              const flatRate = Number(resAttrs.autoLightingFlatRate) || 0;
              if (flatRate > 0) {
                lightingSurcharge = calculateLightingSurcharge(reservedFrom, reservedTo, flatRate);
              }
            }
          }

          const totalBasePrice = basePrice + equipmentCost + lightingSurcharge;

          // Round to 2 decimal places
          const finalPrice = Math.round((totalBasePrice + Number.EPSILON) * 100) / 100;

          // --- B2B Partner Credit & Limit Check ---
          if (partner) {
            const currentBalance = Number(partner.creditBalance) || 0;
            const creditOverdraftLimit = Number(partner.creditLimit) || 0;
            const totalAvailable = currentBalance + creditOverdraftLimit;
            
            if (finalPrice > totalAvailable) {
              throw new Error(`CREDIT_LIMIT_EXCEEDED:${partner.name}:${currentBalance}:${finalPrice}`);
            }

            // Deduct from partner's credit balance inside the transaction
            const newBalance = currentBalance - finalPrice;
            await tx.partner.update({
              where: { id: partner.id },
              data: { creditBalance: newBalance }
            });
          }

          // Determine status
          let bookingStatus = "CONFIRMED";
          if (isUserAdmin) {
            bookingStatus = "CONFIRMED";
          } else if (partner) {
            bookingStatus = "CONFIRMED";
          } else if (finalPrice === 0) {
            bookingStatus = "CONFIRMED";
          } else {
            bookingStatus = "PENDING_PAYMENT";
          }

          // --- User Booking Limits (Daily & Weekly) - Bypassed for admins and partners ---
          if (!isUserAdmin && !partner) {
            const startOfDay = new Date(reservedFrom);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(reservedFrom);
            endOfDay.setUTCHours(23, 59, 59, 999);

            const endOfWeek = new Date(occStartOfWeek);
            endOfWeek.setUTCDate(occStartOfWeek.getUTCDate() + 6);
            endOfWeek.setUTCHours(23, 59, 59, 999);

            // Check daily booking duration limit (Max 4 hours / 240 minutes)
            const dailyBookings = await tx.booking.findMany({
              where: {
                tenantId,
                userEmail,
                status: { in: ["CONFIRMED", "PENDING_PAYMENT", "ATTENDED"] },
                reservedFrom: {
                  gte: startOfDay,
                  lte: endOfDay,
                },
              },
            });

            const dailyMinutes = dailyBookings.reduce((sum, b) => {
              return sum + Math.round((b.reservedTo.getTime() - b.reservedFrom.getTime()) / 60000);
            }, 0);

            const newDurationMin = Math.round((reservedTo.getTime() - reservedFrom.getTime()) / 60000);

            if (dailyMinutes + newDurationMin > 240) {
              const formattedDate = occTargetDate.toISOString().split("T")[0];
              throw new Error(`DAILY_LIMIT_EXCEEDED:${formattedDate}:${Math.round(dailyMinutes)}:${newDurationMin}`);
            }

            // Check weekly booking duration limit (Max 20 hours / 1200 minutes)
            const weeklyBookings = await tx.booking.findMany({
              where: {
                tenantId,
                userEmail,
                status: { in: ["CONFIRMED", "PENDING_PAYMENT", "ATTENDED"] },
                reservedFrom: {
                  gte: occStartOfWeek,
                  lte: endOfWeek,
                },
              },
            });

            const weeklyMinutes = weeklyBookings.reduce((sum, b) => {
              return sum + Math.round((b.reservedTo.getTime() - b.reservedFrom.getTime()) / 60000);
            }, 0);

            if (weeklyMinutes + newDurationMin > 1200) {
              const formattedDate = occTargetDate.toISOString().split("T")[0];
              throw new Error(`WEEKLY_LIMIT_EXCEEDED:${formattedDate}:${Math.round(weeklyMinutes)}:${newDurationMin}`);
            }
          }

          // Create the booking
          const booking = await tx.booking.create({
            data: {
              tenantId,
              resourceId: finalResourceId,
              scheduleRuleId: scheduleRuleId || null,
              oneidUserId,
              userName,
              userEmail,
              reservedFrom,
              reservedTo,
              status: bookingStatus as any,
              price: finalPrice,
              partnerId: partner?.id || null,
              recurrenceGroup,
              rentedEquipment: rentedEquipment || null,
            },
          });
          if (i === 0) {
            createdBookingId = booking.id;
          }
        }

        const firstBooking = await tx.booking.findUnique({
          where: { id: createdBookingId },
          select: { status: true, price: true }
        });

        return { id: createdBookingId, status: firstBooking?.status, price: firstBooking?.price };
      }, {
        isolationLevel: "Serializable"
      });

      // Trigger real-time updates
      await triggerBookingUpdate(tenantId);
      sendSSEUpdate(tenantId);

      // Record audit log for booking creation
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: session?.user?.id || null,
            userName: userName || "Guest",
            action: "BOOKING_CREATE",
            entity: "Booking",
            entityId: result.id,
            payload: { resourceId, startTime, endTime, price: result.price }
          }
        });
      } catch (auditErr) {
        console.error("Audit log booking creation failed", auditErr);
      }

      return NextResponse.json({
        status: "success",
        bookingId: result.id,
        bookingStatus: result.status,
        message: result.status === "PENDING_PAYMENT"
          ? "Reservation created, pending payment."
          : "Reservation confirmed successfully!",
      });
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.startsWith("SUBSCRIPTION_INACTIVE:")) {
        return makeErrorResponse(
          "SUBSCRIPTION_INACTIVE",
          "Rezervaci momentálně nelze vytvořit z provozních důvodů. Prosím, kontaktujte správce areálu."
        );
      }
      if (msg.startsWith("CREDIT_LIMIT_EXCEEDED:")) {
        const parts = msg.split(":");
        const pName = parts[1] || "B2B partner";
        const pBalance = parseFloat(parts[2] || "0").toLocaleString("cs-CZ", { minimumFractionDigits: 2 });
        const pPrice = parseFloat(parts[3] || "0").toLocaleString("cs-CZ", { minimumFractionDigits: 2 });
        return makeErrorResponse(
          "CREDIT_LIMIT_EXCEEDED",
          `Kredit partnera "${pName}" je nedostatečný. Aktuální zůstatek činí ${pBalance} Kč a cena rezervace je ${pPrice} Kč.`
        );
      }
      if (msg.startsWith("EQUIPMENT_CAPACITY_EXCEEDED:")) {
        const parts = msg.split(":");
        const eqName = parts[1] || "vybavení";
        return makeErrorResponse("EQUIPMENT_CAPACITY_EXCEEDED", `Kapacita pro zapůjčení "${eqName}" je v tomto čase (včetně doby schnutí/cooldownu) již plně obsazena.`);
      }
      if (msg === "INVALID_EQUIPMENT") {
        return makeErrorResponse("INVALID_EQUIPMENT", "Vybrané doplňkové vybavení není k dispozici pro tento areál.");
      }
      if (msg === "SCHEDULE_RULE_NOT_FOUND") {
        return makeErrorResponse("SCHEDULE_RULE_NOT_FOUND", "Vybraná lekce nebo časový slot programu nebyly nalezeny. Zkuste prosím obnovit stránku.");
      }
      if (msg === "RESOURCE_NOT_FOUND") {
        return makeErrorResponse("RESOURCE_NOT_FOUND", "Vybraná sportovní plocha nebo sektor nebyly nalezeny. Zkuste prosím obnovit stránku.");
      }
      if (msg.startsWith("CAPACITY_EXCEEDED")) {
        const parts = msg.split(":");
        const formattedDate = parts[1] ? ` dne ${parts[1]}` : "";
        return makeErrorResponse("CAPACITY_EXCEEDED", `Tato lekce / program je již${formattedDate} plně obsazen.`);
      }
      if (msg === "MISSING_PARAMETER") {
        return makeErrorResponse("MISSING_PARAMETER", "Chybí povinné parametry pro dokončení ad-hoc rezervace.");
      }
      if (msg === "TENANT_NOT_FOUND") {
        return makeErrorResponse("TENANT_NOT_FOUND", "Poskytovatel služeb (tenant) nebyl nalezen.");
      }
      if (msg === "INVALID_TIME_FORMAT") {
        return makeErrorResponse("INVALID_TIME_FORMAT", "Čas začátku a konce must být ve formátu HH:MM.");
      }
      if (msg.startsWith("OPERATING_HOURS_EXCEEDED:")) {
        const [, openTime, closeTime] = msg.split(":");
        return makeErrorResponse(
          "OPERATING_HOURS_EXCEEDED",
          `Rezervaci lze provést pouze v provozní době (${openTime} – ${closeTime}).`
        );
      }
      if (msg === "INVALID_TIME_RANGE") {
        return makeErrorResponse("INVALID_TIME_RANGE", "Čas začátku musí předcházet času konce.");
      }
      if (msg.startsWith("TECHNICAL_BREAK_CONFLICT")) {
        const parts = msg.split(":");
        const dateStr = parts[1] ? `dne ${parts[1]}` : "v danou dobu";
        return makeErrorResponse("TECHNICAL_BREAK_CONFLICT", `Vybraný sportovní areál / sektor je ${dateStr} již obsazen (probíhá technická přestávka).`);
      }
      if (msg.startsWith("CLOSURE_EXCEPTION:")) {
        const parts = msg.split(":");
        const name = parts[1] || "Mimořádná uzavírka";
        return makeErrorResponse("CLOSURE_EXCEPTION", `V tomto termínu nelze rezervovat. Probíhá mimořádná uzavírka: ${name}.`);
      }
      if (msg.startsWith("OVERLAP_CONFLICT") || error.code === "P2034") {
        const parts = msg.split(":");
        const dateStr = parts[1] ? `dne ${parts[1]}` : "v danou dobu";
        return makeErrorResponse("OVERLAP_CONFLICT", `Vybraný sportovní areál / sektor je ${dateStr} již obsazen.`);
      }
      if (msg === "PAST_BOOKING_NOT_ALLOWED") {
        return makeErrorResponse("PAST_BOOKING_NOT_ALLOWED", "Rezervaci nelze provést pro čas v minulosti.");
      }
      if (msg.startsWith("DAILY_LIMIT_EXCEEDED:")) {
        const parts = msg.split(":");
        const dateStr = parts[1] || "";
        const dailyMinutes = parts[2] || "0";
        const newDurationMin = parts[3] || "0";
        return makeErrorResponse(
          "DAILY_LIMIT_EXCEEDED",
          `Překročili jste denní limit rezervací (max. 4 hodiny). Dne ${dateStr} již máte rezervováno ${dailyMinutes} minut a tato rezervace by přidala dalších ${newDurationMin} minut.`
        );
      }
      if (msg.startsWith("WEEKLY_LIMIT_EXCEEDED:")) {
        const parts = msg.split(":");
        const dateStr = parts[1] || "";
        const weeklyMinutes = parts[2] || "0";
        const newDurationMin = parts[3] || "0";
        return makeErrorResponse(
          "WEEKLY_LIMIT_EXCEEDED",
          `Překročili jste týdenní limit rezervací (max. 20 hodin). V týdnu s datem ${dateStr} již máte rezervováno ${weeklyMinutes} minut a tato rezervace by přidala dalších ${newDurationMin} minut.`
        );
      }

      console.error("Booking API error:", error);
      return makeErrorResponse("DATABASE_ERROR", "Nastala neočekávaná chyba při komunikaci s databází. Zkuste to prosím znovu.", {}, 500);
    }
  } catch (error: any) {
    console.error("Booking API outer error:", error);
    return makeErrorResponse("DATABASE_ERROR", "Nastala neočekávaná chyba při zpracování požadavku. Zkuste to prosím znovu.", {}, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    const cancelSeries = searchParams.get("cancelSeries") === "true";

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const isPendingPayment = booking.status === "PENDING_PAYMENT";
    let isAuthorized = isPendingPayment;

    if (!isAuthorized && session && session.user) {
      const userEmail = session.user.email || "";
      const adminEmails = (booking.tenant.attributes as any)?.adminEmails || [];
      const userRole = (session.user as any).role;
      const userTenantId = (session.user as any).tenantId;

      isAuthorized = 
        (userRole === "ADMIN" && userTenantId === booking.tenantId) ||
        adminEmails.includes(userEmail) || 
        booking.userEmail === userEmail;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (cancelSeries && booking.recurrenceGroup) {
      // Find all bookings in the series to calculate total refund
      const seriesBookings = await prisma.booking.findMany({
        where: { recurrenceGroup: booking.recurrenceGroup }
      });

      if (booking.partnerId) {
        const totalRefund = seriesBookings.reduce((sum, b) => sum + Number(b.price || 0), 0);
        if (totalRefund > 0) {
          await prisma.partner.update({
            where: { id: booking.partnerId },
            data: { creditBalance: { increment: totalRefund } }
          });
        }
      }

      await prisma.booking.deleteMany({
        where: { recurrenceGroup: booking.recurrenceGroup },
      });

      // Record audit log
      try {
        await prisma.auditLog.create({
          data: {
            tenantId: booking.tenantId,
            userId: session?.user?.id || null,
            userName: session?.user?.name || "System",
            action: "BOOKING_CANCEL_SERIES",
            entity: "Booking",
            entityId: bookingId,
            payload: { recurrenceGroup: booking.recurrenceGroup, bookingsCount: seriesBookings.length }
          }
        });
      } catch (auditErr) {
        console.error("Audit log cancel series booking failed", auditErr);
      }
    } else {
      if (booking.partnerId && Number(booking.price) > 0) {
        await prisma.partner.update({
          where: { id: booking.partnerId },
          data: { creditBalance: { increment: Number(booking.price) } }
        });
      }

      await prisma.booking.delete({
        where: { id: bookingId },
      });

      // Record audit log
      try {
        await prisma.auditLog.create({
          data: {
            tenantId: booking.tenantId,
            userId: session?.user?.id || null,
            userName: session?.user?.name || "System",
            action: "BOOKING_CANCEL",
            entity: "Booking",
            entityId: bookingId,
            payload: { userName: booking.userName, userEmail: booking.userEmail, price: Number(booking.price) }
          }
        });
      } catch (auditErr) {
        console.error("Audit log cancel booking failed", auditErr);
      }
    }

    // Trigger real-time updates
    await triggerBookingUpdate(booking.tenantId);
    sendSSEUpdate(booking.tenantId);

    return NextResponse.json({ status: "success", message: "Booking cancelled successfully" });
  } catch (error: any) {
    console.error("Delete booking error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return makeErrorResponse("UNAUTHORIZED", "Nejste přihlášen(a).", {}, 401);
    }

    const body = await request.json();
    const { 
      bookingId,
      resourceId, 
      dayIndex, 
      startTime, 
      endTime, 
      weekStart
    } = body;

    if (!bookingId) {
      return makeErrorResponse("MISSING_PARAMETER", "Chybí identifikátor rezervace (bookingId).");
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true },
    });

    if (!booking) {
      return makeErrorResponse("RESOURCE_NOT_FOUND", "Rezervace nebyla nalezena.");
    }

    const userEmail = session.user.email || "";
    const adminEmails = (booking.tenant.attributes as any)?.adminEmails || [];
    const userRole = (session.user as any).role;
    const userTenantId = (session.user as any).tenantId;

    const isAuthorized = 
      (userRole === "ADMIN" && userTenantId === booking.tenantId) ||
      adminEmails.includes(userEmail) || 
      booking.userEmail === userEmail;

    if (!isAuthorized) {
      return makeErrorResponse("UNAUTHORIZED", "Nemáte oprávnění k úpravě této rezervace.", {}, 403);
    }

    // Determine target values, fallback to existing booking's time/day/resource
    const finalResourceId = resourceId || booking.resourceId;
    
    // Get existing start hour and day index from the existing reservedFrom
    const existingDayIndex = (booking.reservedFrom.getUTCDay() === 0) ? 6 : booking.reservedFrom.getUTCDay() - 1;
    const finalDayIndex = dayIndex !== undefined ? dayIndex : existingDayIndex;

    // Format existing time to HH:MM if not provided
    const formatTime = (date: Date) => {
      const h = String(date.getUTCHours()).padStart(2, "0");
      const m = String(date.getUTCMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    };
    
    const finalStartTime = startTime || formatTime(booking.reservedFrom);
    const finalEndTime = endTime || formatTime(booking.reservedTo);

    // Get week start from request, or calculate from booking.reservedFrom
    let finalWeekStart = weekStart;
    if (!finalWeekStart) {
      const tempDate = new Date(booking.reservedFrom);
      const day = tempDate.getUTCDay();
      const diff = tempDate.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(tempDate.setUTCDate(diff));
      finalWeekStart = monday.toISOString().split("T")[0];
    }

    const startOfWeek = new Date(`${finalWeekStart}T00:00:00.000Z`);
    const targetDate = new Date(startOfWeek);
    targetDate.setUTCDate(startOfWeek.getUTCDate() + finalDayIndex);

    const [startHourStr, startMinStr] = finalStartTime.split(":");
    const [endHourStr, endMinStr] = finalEndTime.split(":");

    const reservedFrom = new Date(targetDate);
    reservedFrom.setUTCHours(parseInt(startHourStr, 10), parseInt(startMinStr, 10), 0, 0);

    const reservedTo = new Date(targetDate);
    reservedTo.setUTCHours(parseInt(endHourStr, 10), parseInt(endMinStr, 10), 0, 0);

    if (reservedFrom >= reservedTo) {
      return makeErrorResponse("INVALID_TIME_RANGE", "Čas začátku musí předcházet času konce.");
    }

    if (reservedFrom < getLocalAsUtcDate(new Date(), booking.tenant.timezone)) {
      return makeErrorResponse("PAST_BOOKING_NOT_ALLOWED", "Rezervaci nelze přesunout do minulosti.");
    }

    // Tenant check and operating hours check
    const tenant = await prisma.tenant.findUnique({
      where: { id: booking.tenantId },
      include: { 
        resources: {
          include: {
            scheduleRules: true
          }
        } 
      },
    });

    if (!tenant) {
      return makeErrorResponse("TENANT_NOT_FOUND", "Poskytovatel služeb nebyl nalezen.");
    }

    // Validate operating hours (support resource-specific rules and parent branch inheritance)
    const attrs = (tenant.attributes as any) || {};

    const getActiveRulesForResource = (resId: string): any[] => {
      const res = tenant.resources.find((r: any) => r.id === resId);
      if (!res) return [];
      if (res.scheduleRules && res.scheduleRules.length > 0) {
        return res.scheduleRules;
      }
      const pId = (res.attributes as any)?.parentId;
      if (pId) {
        return getActiveRulesForResource(pId);
      }
      return [];
    };

    const activeRules = getActiveRulesForResource(finalResourceId);

    if (activeRules.length > 0) {
      const utcDay = reservedFrom.getUTCDay(); // 0 (Sunday) to 6 (Saturday)
      const dayRules = activeRules.filter((r: any) => r.dayOfWeek === utcDay);
      if (dayRules.length === 0) {
        return makeErrorResponse(
          "OPERATING_HOURS_EXCEEDED",
          "Tento den má vybraný zdroj zavřeno."
        );
      }

      const [startH, startM] = finalStartTime.split(":").map(Number);
      const [endH, endM] = finalEndTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      const fits = dayRules.some((rule: any) => {
        const [openH, openM] = rule.startTime.split(":").map(Number);
        const [closeH, closeM] = rule.endTime.split(":").map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;
        return startMinutes >= openMinutes && endMinutes <= closeMinutes;
      });

      if (!fits) {
        let minOpen = "08:00";
        let maxClose = "18:00";
        let minMinutes = 24 * 60;
        let maxMinutes = 0;
        dayRules.forEach((rule: any) => {
          const [oh, om] = rule.startTime.split(":").map(Number);
          const [ch, cm] = rule.endTime.split(":").map(Number);
          const openVal = oh * 60 + om;
          const closeVal = ch * 60 + cm;
          if (openVal < minMinutes) {
            minMinutes = openVal;
            minOpen = rule.startTime;
          }
          if (closeVal > maxMinutes) {
            maxMinutes = closeVal;
            maxClose = rule.endTime;
          }
        });
        return makeErrorResponse(
          "OPERATING_HOURS_EXCEEDED",
          `Rezervaci lze přesunout pouze do provozní doby (${minOpen} – ${maxClose}).`
        );
      }
    } else {
      // Default fallback validation against global tenant operating hours
      const openingHours = attrs.openingHours || [];
      let openTime = attrs.openTime || "08:00";
      let closeTime = attrs.closeTime || "18:00";
      let closed = false;

      if (openingHours.length > 0) {
        const utcDay = reservedFrom.getUTCDay();
        const dayData = openingHours.find((d: any) => d.dayOfWeek === utcDay);
        if (dayData) {
          openTime = dayData.openTime;
          closeTime = dayData.closeTime;
          closed = dayData.closed;
        }
      }

      if (closed) {
        return makeErrorResponse(
          "OPERATING_HOURS_EXCEEDED",
          "Tento den je zavřeno."
        );
      }

      const [openH, openM] = openTime.split(":").map(Number);
      const [closeH, closeM] = closeTime.split(":").map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      const [startH, startM] = finalStartTime.split(":").map(Number);
      const [endH, endM] = finalEndTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes < openMinutes || endMinutes > closeMinutes) {
        return makeErrorResponse(
          "OPERATING_HOURS_EXCEEDED",
          `Rezervaci lze přesunout pouze do provozní doby (${openTime} – ${closeTime}).`
        );
      }
    }

    // Overlap checks
    const tenantResources = tenant.resources;
    const getAncestors = (id: string): string[] => {
      const res = tenantResources.find((r: any) => r.id === id);
      const parentId = (res?.attributes as any)?.parentId;
      if (!parentId) return [];
      return [parentId, ...getAncestors(parentId)];
    };

    const getDescendants = (id: string): string[] => {
      const children = tenantResources.filter((r: any) => (r.attributes as any)?.parentId === id);
      const childIds = children.map((c: any) => c.id);
      const grandchildIds = childIds.flatMap((cid: any) => getDescendants(cid));
      return [...childIds, ...grandchildIds];
    };

    const conflictingResourceIds = [
      finalResourceId,
      ...getAncestors(finalResourceId),
      ...getDescendants(finalResourceId),
    ];

    // Check overlaps, ignoring this booking's ID, respecting technical breaks
    const possibleOverlapping = await prisma.booking.findMany({
      where: {
        id: { not: bookingId },
        resourceId: { in: conflictingResourceIds },
        status: { in: ["CONFIRMED", "PENDING_PAYMENT", "ATTENDED"] },
        reservedFrom: { lt: new Date(reservedTo.getTime() + 24 * 60 * 60 * 1000) },
        reservedTo: { gt: new Date(reservedFrom.getTime() - 24 * 60 * 60 * 1000) },
      },
    });

    const getBreakMinutes = (rId: string): number => {
      const res = tenant.resources.find((r: any) => r.id === rId);
      if (!res) return 0;
      const attrs = (res.attributes as any) || {};
      if (attrs.technicalBreak) {
        return parseInt(attrs.technicalBreakMinutes, 10) || 0;
      }
      return 0;
    };

    const targetBreak = getBreakMinutes(finalResourceId);
    const newStart = reservedFrom.getTime();
    const newEnd = reservedTo.getTime();
    const newBreakMs = targetBreak * 60 * 1000;

    const overlapping = possibleOverlapping.find((b: any) => {
      const existStart = b.reservedFrom.getTime();
      const existEnd = b.reservedTo.getTime();
      const existBreakMs = getBreakMinutes(b.resourceId) * 60 * 1000;
      return newStart < existEnd + existBreakMs && existStart < newEnd + newBreakMs;
    });

    if (overlapping) {
      const isStandardOverlap = newStart < overlapping.reservedTo.getTime() && overlapping.reservedFrom.getTime() < newEnd;
      if (isStandardOverlap) {
        return makeErrorResponse("OVERLAP_CONFLICT", `Vybraný sportovní areál / sektor je v danou dobu již obsazen.`);
      } else {
        return makeErrorResponse("TECHNICAL_BREAK_CONFLICT", `Vybraný sportovní areál / sektor je v danou dobu již obsazen (probíhá technická přestávka).`);
      }
    }

    // Check daily booking duration limit (Max 4 hours / 240 minutes)
    const startOfDay = new Date(reservedFrom);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(reservedFrom);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const dailyBookings = await prisma.booking.findMany({
      where: {
        id: { not: bookingId },
        tenantId: booking.tenantId,
        userEmail: booking.userEmail,
        status: { in: ["CONFIRMED", "PENDING_PAYMENT", "ATTENDED"] },
        reservedFrom: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const dailyMinutes = dailyBookings.reduce((sum, b) => {
      return sum + Math.round((b.reservedTo.getTime() - b.reservedFrom.getTime()) / 60000);
    }, 0);

    const newDurationMin = Math.round((reservedTo.getTime() - reservedFrom.getTime()) / 60000);

    if (dailyMinutes + newDurationMin > 240) {
      return makeErrorResponse(
        "DAILY_LIMIT_EXCEEDED",
        `Překročili jste denní limit rezervací (max. 4 hodiny). Dne ${targetDate.toISOString().split("T")[0]} již máte rezervováno ${dailyMinutes} minut a tato rezervace by přidala dalších ${newDurationMin} minut.`
      );
    }

    // Check weekly booking duration limit (Max 20 hours / 1200 minutes)
    const occStartOfWeek = new Date(startOfWeek);
    const endOfWeek = new Date(occStartOfWeek);
    endOfWeek.setUTCDate(occStartOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    const weeklyBookings = await prisma.booking.findMany({
      where: {
        id: { not: bookingId },
        tenantId: booking.tenantId,
        userEmail: booking.userEmail,
        status: { in: ["CONFIRMED", "PENDING_PAYMENT", "ATTENDED"] },
        reservedFrom: {
          gte: occStartOfWeek,
          lte: endOfWeek,
        },
      },
    });

    const weeklyMinutes = weeklyBookings.reduce((sum, b) => {
      return sum + Math.round((b.reservedTo.getTime() - b.reservedFrom.getTime()) / 60000);
    }, 0);

    if (weeklyMinutes + newDurationMin > 1200) {
      return makeErrorResponse(
        "WEEKLY_LIMIT_EXCEEDED",
        `Překročili jste týdenní limit rezervací (max. 20 hodin). V týdnu s datem ${finalWeekStart} již máte rezervováno ${weeklyMinutes} minut a tato rezervace by přidala dalších ${newDurationMin} minut.`
      );
    }

    // Update the booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        resourceId: finalResourceId,
        reservedFrom,
        reservedTo,
      },
    });

    // Trigger real-time updates
    await triggerBookingUpdate(booking.tenantId);
    sendSSEUpdate(booking.tenantId);

    return NextResponse.json({
      status: "success",
      message: "Rezervace byla úspěšně změněna.",
    });
  } catch (error: any) {
    console.error("Modify booking error:", error);
    return makeErrorResponse("DATABASE_ERROR", "Nastala neočekávaná chyba. Zkuste to prosím znovu.", {}, 500);
  }
}

