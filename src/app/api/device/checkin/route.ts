import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

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

      // 2. Fetch booking and validation windows
      const booking = await prisma.booking.findUnique({
        where: { id: qrPayload },
        include: { resource: true },
      });

      if (!booking) {
        return NextResponse.json({ status: "denied", reason: "unknown_ticket" });
      }

      if (booking.status !== "CONFIRMED") {
        return NextResponse.json({ status: "denied", reason: "invalid_status", bookingStatus: booking.status });
      }

      const now = new Date();
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
