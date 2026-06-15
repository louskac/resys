import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { makeErrorResponse } from "@/lib/errors";
import { triggerBookingUpdate } from "@/lib/pusher";
import { sendSSEUpdate } from "@/lib/sse";
import crypto from "crypto";

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
      recurrenceCount
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
        const adminEmails = (tenantObj.attributes as any)?.adminEmails || ["josef.novak@deepvision.cz"];
        isUserAdmin = adminEmails.includes(activeUserEmail) || activeUserEmail.endsWith("@deepvision.cz");
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
            include: { resources: true },
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

          // Validate operating hours
          const attrs = (tenant.attributes as any) || {};
          const openTime = attrs.openTime || "08:00";
          const closeTime = attrs.closeTime || "18:00";

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
                status: "CONFIRMED",
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

            // Check for overlapping bookings on conflicting resources
            const overlapping = await tx.booking.findFirst({
              where: {
                resourceId: { in: conflictingResourceIds },
                status: "CONFIRMED",
                OR: [
                  {
                    reservedFrom: { lt: reservedTo },
                    reservedTo: { gt: reservedFrom },
                  },
                ],
              },
            });

            if (overlapping) {
              const formattedDate = occTargetDate.toISOString().split("T")[0];
              throw new Error(`OVERLAP_CONFLICT:${formattedDate}`);
            }
          }

          // --- Validate that the booking is not in the past ---
          if (reservedFrom < new Date()) {
            throw new Error("PAST_BOOKING_NOT_ALLOWED");
          }

          // --- User Booking Limits (Daily & Weekly) ---
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
              status: "CONFIRMED",
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
              status: "CONFIRMED",
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
              status: "CONFIRMED", // Confirm immediately for sandbox dev
              recurrenceGroup,
            },
          });
          if (i === 0) {
            createdBookingId = booking.id;
          }
        }

        return { id: createdBookingId };
      }, {
        isolationLevel: "Serializable"
      });

      // Trigger real-time updates
      await triggerBookingUpdate(tenantId);
      sendSSEUpdate(tenantId);

      return NextResponse.json({
        status: "success",
        bookingId: result.id,
        message: "Reservation confirmed successfully!",
      });
    } catch (error: any) {
      const msg = error.message || "";
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
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const userEmail = session.user.email || "";
    const adminEmails = (booking.tenant.attributes as any)?.adminEmails || ["josef.novak@deepvision.cz"];

    const isAuthorized = 
      adminEmails.includes(userEmail) || 
      userEmail.endsWith("@deepvision.cz");

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (cancelSeries && booking.recurrenceGroup) {
      await prisma.booking.deleteMany({
        where: { recurrenceGroup: booking.recurrenceGroup },
      });
    } else {
      await prisma.booking.delete({
        where: { id: bookingId },
      });
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

