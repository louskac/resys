import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { makeErrorResponse } from "@/lib/errors";

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
      weekStart
    } = body;

    if (!tenantId || dayIndex === undefined) {
      return makeErrorResponse("MISSING_PARAMETER", "Missing tenantId or dayIndex");
    }

    if (typeof dayIndex !== "number" || dayIndex < 0 || dayIndex > 6) {
      return makeErrorResponse("INVALID_DAY_INDEX", "Day index must be a number between 0 and 6.");
    }

    let userName = "";
    let userEmail = "";
    let oneidUserId = "";

    if (session && session.user) {
      userName = session.user.name || "Unknown User";
      userEmail = session.user.email || "unknown@domain.com";
      oneidUserId = (session.user as any).id || "unknown";
    } else {
      if (!guestName || !guestEmail) {
        return makeErrorResponse("MISSING_PARAMETER", "Please enter your name and email to proceed with guest booking.");
      }
      userName = guestName;
      userEmail = guestEmail;
      oneidUserId = "guest";
    }

    // Reference week date calculations
    const startOfWeek = new Date(`${weekStart || "2026-06-08"}T00:00:00`);
    const targetDate = new Date(startOfWeek);
    targetDate.setDate(startOfWeek.getDate() + dayIndex);

    let finalResourceId = resourceId;
    let reservedFrom: Date;
    let reservedTo: Date;

    if (scheduleRuleId) {
      // --- Case A: Booking a pre-configured program slot / class ---
      const rule = await prisma.scheduleRule.findUnique({
        where: { id: scheduleRuleId },
        include: { resource: true },
      });

      if (!rule || rule.resource.tenantId !== tenantId) {
        return makeErrorResponse("RESOURCE_NOT_FOUND", "Invalid schedule rule selection.");
      }

      finalResourceId = rule.resourceId;

      const [startHourStr, startMinStr] = rule.startTime.split(":");
      const [endHourStr, endMinStr] = rule.endTime.split(":");

      reservedFrom = new Date(targetDate);
      reservedFrom.setHours(parseInt(startHourStr, 10), parseInt(startMinStr, 10), 0, 0);

      reservedTo = new Date(targetDate);
      reservedTo.setHours(parseInt(endHourStr, 10), parseInt(endMinStr, 10), 0, 0);

      // Capacity check
      const confirmedCount = await prisma.booking.count({
        where: {
          scheduleRuleId,
          status: "CONFIRMED",
        },
      });

      if (confirmedCount >= rule.maxCapacity) {
        return makeErrorResponse("CAPACITY_EXCEEDED", "Tato lekce / program je již plně obsazen.");
      }

    } else {
      // --- Case B: Booking an ad-hoc custom time slot (e.g. sport field rental) ---
      if (!resourceId || !startTime || !endTime) {
        return makeErrorResponse("MISSING_PARAMETER", "Missing parameters for custom booking");
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { resources: true },
      });

      if (!tenant) {
        return makeErrorResponse("TENANT_NOT_FOUND", "Tenant not found");
      }

      const resource = tenant.resources.find(r => r.id === resourceId);
      if (!resource) {
        return makeErrorResponse("RESOURCE_NOT_FOUND", "Invalid resource selection");
      }

      // Validate time string formats
      const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return makeErrorResponse("INVALID_TIME_FORMAT", "Čas začátku a konce musí být ve formátu HH:MM.");
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
        return makeErrorResponse(
          "OPERATING_HOURS_EXCEEDED",
          `Rezervaci lze provést pouze v provozní době (${openTime} – ${closeTime}).`
        );
      }

      const tenantResources = tenant.resources;

      // Helper to traverse up and find all ancestors
      const getAncestors = (id: string): string[] => {
        const res = tenantResources.find(r => r.id === id);
        const parentId = (res?.attributes as any)?.parentId;
        if (!parentId) return [];
        return [parentId, ...getAncestors(parentId)];
      };

      // Helper to traverse down and find all descendants
      const getDescendants = (id: string): string[] => {
        const children = tenantResources.filter(r => (r.attributes as any)?.parentId === id);
        const childIds = children.map(c => c.id);
        const grandchildIds = childIds.flatMap(cid => getDescendants(cid));
        return [...childIds, ...grandchildIds];
      };

      const conflictingResourceIds = [
        resourceId,
        ...getAncestors(resourceId),
        ...getDescendants(resourceId),
      ];

      const [startHourStr, startMinStr] = startTime.split(":");
      const [endHourStr, endMinStr] = endTime.split(":");

      reservedFrom = new Date(targetDate);
      reservedFrom.setHours(parseInt(startHourStr, 10), parseInt(startMinStr, 10), 0, 0);

      reservedTo = new Date(targetDate);
      reservedTo.setHours(parseInt(endHourStr, 10), parseInt(endMinStr, 10), 0, 0);

      if (reservedFrom >= reservedTo) {
        return makeErrorResponse("INVALID_TIME_RANGE", "Čas začátku musí předcházet času konce.");
      }

      // Check for overlapping bookings on conflicting resources
      const overlapping = await prisma.booking.findFirst({
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
        return makeErrorResponse("OVERLAP_CONFLICT", "Vybraný sportovní areál / sektor je v danou dobu již obsazen.");
      }
    }

    // --- Validate that the booking is not in the past ---
    if (reservedFrom < new Date()) {
      return makeErrorResponse("PAST_BOOKING_NOT_ALLOWED", "Rezervaci nelze provést pro čas v minulosti.");
    }

    // --- User Booking Limits (Daily & Weekly) ---
    const startOfDay = new Date(reservedFrom);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reservedFrom);
    endOfDay.setHours(23, 59, 59, 999);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Check daily booking duration limit (Max 2 hours / 120 minutes)
    const dailyBookings = await prisma.booking.findMany({
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

    if (dailyMinutes + newDurationMin > 120) {
      return makeErrorResponse(
        "DAILY_LIMIT_EXCEEDED",
        `Překročili jste denní limit rezervací (2 hodiny). Dnes již máte rezervováno ${Math.round(dailyMinutes)} minut a tato rezervace by přidala dalších ${newDurationMin} minut.`
      );
    }

    // Check weekly booking duration limit (Max 4 hours / 240 minutes)
    const weeklyBookings = await prisma.booking.findMany({
      where: {
        tenantId,
        userEmail,
        status: "CONFIRMED",
        reservedFrom: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

    const weeklyMinutes = weeklyBookings.reduce((sum, b) => {
      return sum + Math.round((b.reservedTo.getTime() - b.reservedFrom.getTime()) / 60000);
    }, 0);

    if (weeklyMinutes + newDurationMin > 240) {
      return makeErrorResponse(
        "WEEKLY_LIMIT_EXCEEDED",
        `Překročili jste týdenní limit rezervací (4 hodiny). Tento týden již máte rezervováno ${Math.round(weeklyMinutes)} minut a tato rezervace by přidala dalších ${newDurationMin} minut.`
      );
    }

    // 3. Create the booking
    const booking = await prisma.booking.create({
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
      },
    });

    return NextResponse.json({
      status: "success",
      bookingId: booking.id,
      message: "Reservation confirmed successfully!",
    });
  } catch (error) {
    console.error("Booking API error:", error);
    return makeErrorResponse("DATABASE_ERROR", "Internal Server Error or Database transaction fail.", {}, 500);
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

    await prisma.booking.delete({
      where: { id: bookingId },
    });

    return NextResponse.json({ status: "success", message: "Booking cancelled successfully" });
  } catch (error: any) {
    console.error("Delete booking error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
