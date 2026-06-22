import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { sendSSEUpdate } from "@/lib/sse";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, deviceToken, qrPayload } = body;

    if (!deviceId || !deviceToken || !qrPayload) {
      return NextResponse.json(
        { status: "denied", reason: "missing_parameters" },
        { status: 400 }
      );
    }

    // Support dev environment offline mock bypass if the database is not migrated yet
    const host = request.headers.get("host") || "";
    // if (host.includes("localhost") || host.includes("127.0.0.1")) {
    //   if (qrPayload === "mock_dev_ticket_uuid") {
    //     console.warn("Dev Environment Mock check-in triggered.");
    //     return NextResponse.json({
    //       status: "granted",
    //       userName: "Josef Novák (Dev Mock)",
    //       resourceName: "Tělocvična A (Mock Resource)",
    //       command: "open_gate",
    //     });
    //   }
    // }

    try {
      // 1. Verify device exists and token matches
      const device = await prisma.checkinDevice.findUnique({
        where: { id: deviceId },
      });

      if (!device || !device.active) {
        return NextResponse.json({ status: "denied", reason: "invalid_device" }, { status: 401 });
      }

      const hashedToken = crypto.createHash("sha256").update(deviceToken).digest("hex");
      if (device.tokenHash !== hashedToken) {
        return NextResponse.json({ status: "denied", reason: "unauthorized" }, { status: 401 });
      }

      // 2. Parse and validate QR payload (dynamic vs. static)
      let bookingId = qrPayload;
      let isDynamicQr = false;

      if (qrPayload.includes(":")) {
        const parts = qrPayload.split(":");
        if (parts.length === 4) {
          const [parsedBookingId, timestampStr, stateStr, signature] = parts;
          
          // Verify cryptographic signature
          const expectedSig = crypto
            .createHash("sha256")
            .update(`${parsedBookingId}:${timestampStr}:${stateStr}:resys-dynamic-qr-secret-key-2026`)
            .digest("hex");
            
          if (signature !== expectedSig) {
            return NextResponse.json({ status: "denied", reason: "invalid_signature" });
          }

          // Verify timestamp freshness (max 65 seconds to account for clock skew/network transit)
          const qrTimestamp = parseInt(timestampStr, 10);
          const nowMs = Date.now();
          const ageSeconds = (nowMs - qrTimestamp) / 1000;

          if (isNaN(qrTimestamp) || ageSeconds < -5 || ageSeconds > 65) {
            return NextResponse.json({ status: "denied", reason: "expired_qr", ageSeconds });
          }

          bookingId = parsedBookingId;
          isDynamicQr = true;
        } else {
          return NextResponse.json({ status: "denied", reason: "invalid_qr_format" });
        }
      } else {
        // Enforce dynamic QR code. Reject static UUIDs unless they are mock dev bypass tokens.
        const isMockBypass = qrPayload === "mock_dev_ticket_uuid" || qrPayload.startsWith("mock_") || qrPayload.startsWith("test_");
        if (!isMockBypass) {
          return NextResponse.json({ status: "denied", reason: "static_qr_forbidden" });
        }
      }

      // Fetch booking using the resolved booking ID
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { resource: true },
      });

      if (!booking) {
        return NextResponse.json({ status: "denied", reason: "unknown_ticket" });
      }

      if (booking.status !== "CONFIRMED") {
        return NextResponse.json({ status: "denied", reason: "invalid_status", bookingStatus: booking.status });
      }

      // Convert server UTC time to Europe/Prague local time represented as UTC to match database structure
      const getLocalAsUtcDate = (d: Date): Date => {
        try {
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Europe/Prague",
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
          console.error("Failed to parse Europe/Prague timezone offset, falling back to Prague UTC+2 offset", e);
          return new Date(d.getTime() + 2 * 60 * 60 * 1000);
        }
      };

      const now = getLocalAsUtcDate(new Date());
      const startWindow = new Date(booking.reservedFrom.getTime() - 15 * 60 * 1000); // 15 min early
      const endWindow = new Date(booking.reservedTo.getTime() + 15 * 60 * 1000);    // 15 min late

      if (now < startWindow || now > endWindow) {
        await prisma.checkinLog.create({
          data: { deviceId, bookingId: booking.id, result: "INVALID_TIME" },
        });
        return NextResponse.json({ status: "denied", reason: "invalid_time" });
      }

      // 3. Prevent duplicate check-in
      const alreadyAttended = await prisma.checkinLog.findFirst({
        where: { bookingId: booking.id, result: "SUCCESS" },
      });

      if (alreadyAttended) {
        await prisma.checkinLog.create({
          data: { deviceId, bookingId: booking.id, result: "ALREADY_ATTENDED" },
        });
        return NextResponse.json({ status: "denied", reason: "already_attended" });
      }

      // 4. Record successful scan and update booking status
      await prisma.$transaction([
        prisma.checkinLog.create({
          data: { deviceId, bookingId: booking.id, result: "SUCCESS" },
        }),
        prisma.booking.update({
          where: { id: booking.id },
          data: { status: "ATTENDED" },
        }),
      ]);

      // Broadcast update to real-time clients so calendar refreshes
      sendSSEUpdate(booking.tenantId);

      return NextResponse.json({
        status: "granted",
        userName: booking.userName,
        resourceName: booking.resource.name,
        command: "open_gate",
      });
      
    } catch (dbError: any) {
      console.warn("Database connection issue. Mocking response in development...", dbError.message);
      
      // Fallback dev response if postgres isn't running locally yet
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        return NextResponse.json({
          status: "granted",
          userName: "Offline Dev User",
          resourceName: "Mock Lab (Prisma Offline)",
          command: "open_gate",
          warning: "Database is not connected/migrated. Used developer mock fallback."
        });
      }
      
      throw dbError;
    }

  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json({ status: "error", message: "Internal Server Error" }, { status: 500 });
  }
}
