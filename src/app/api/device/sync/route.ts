import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendSSEUpdate } from "@/lib/sse";
import { prisma } from "@/lib/prisma";

// Helper to convert date to Europe/Prague timezone relative UTC
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
    return new Date(d.getTime() + 2 * 60 * 60 * 1000);
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. DEVICE PAIRING FLOW
    if (action === "pair") {
      const { pairingCode } = body;
      if (!pairingCode) {
        return NextResponse.json({ error: "pairingCode is required" }, { status: 400 });
      }

      // Find device with active pairing code
      const device = await prisma.checkinDevice.findFirst({
        where: {
          pairingCode,
          pairingExpiresAt: {
            gt: new Date()
          }
        }
      });

      if (!device) {
        return NextResponse.json({ error: "Invalid or expired pairing code" }, { status: 400 });
      }

      // Generate a new secure token for the device
      const deviceToken = "dev_" + crypto.randomBytes(24).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(deviceToken).digest("hex");

      // Activate device
      const updatedDevice = await prisma.checkinDevice.update({
        where: { id: device.id },
        data: {
          active: true,
          tokenHash,
          pairingCode: null,
          pairingExpiresAt: null,
          status: "ONLINE",
          lastSeenAt: new Date()
        }
      });

      // Log in audit log
      try {
        await prisma.auditLog.create({
          data: {
            tenantId: device.tenantId,
            action: "DEVICE_PAIRED",
            entity: "CheckinDevice",
            entityId: device.id,
            payload: { name: device.name }
          }
        });
      } catch (auditErr) {
        console.error("Audit log device pairing failed", auditErr);
      }

      return NextResponse.json({
        status: "success",
        deviceId: updatedDevice.id,
        deviceToken,
        deviceName: updatedDevice.name,
        tenantId: updatedDevice.tenantId
      });
    }

    // 2. OFFLINE LOG RECONCILIATION FLOW
    if (action === "sync") {
      const { deviceId, deviceToken, logs } = body;
      if (!deviceId || !deviceToken || !Array.isArray(logs)) {
        return NextResponse.json({ error: "deviceId, deviceToken and logs array are required" }, { status: 400 });
      }

      // Authorize device
      const device = await prisma.checkinDevice.findUnique({
        where: { id: deviceId }
      });

      if (!device || !device.active) {
        return NextResponse.json({ error: "Unauthorized or inactive device" }, { status: 401 });
      }

      const hashedToken = crypto.createHash("sha256").update(deviceToken).digest("hex");
      if (device.tokenHash !== hashedToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Process logs in transaction/batch
      let processedCount = 0;
      const tenantId = device.tenantId;

      for (const logItem of logs) {
        const { bookingId, result, timestamp } = logItem;
        if (!bookingId || !result) continue;

        const logTime = timestamp ? new Date(timestamp) : new Date();

        try {
          // Check if log already exists to prevent duplicate sync processing
          const existingLog = await prisma.checkinLog.findFirst({
            where: {
              bookingId,
              result: result as any,
              scannedAt: {
                gte: new Date(logTime.getTime() - 2000),
                lte: new Date(logTime.getTime() + 2000)
              }
            }
          });

          if (!existingLog) {
            await prisma.checkinLog.create({
              data: {
                deviceId,
                bookingId,
                result: result as any,
                scannedAt: logTime
              }
            });

            if (result === "SUCCESS") {
              await prisma.booking.updateMany({
                where: { id: bookingId, status: "CONFIRMED" },
                data: { status: "ATTENDED" }
              });
            }
            processedCount++;
          }
        } catch (err) {
          console.error(`Failed to sync check-in log for booking ${bookingId}:`, err);
        }
      }

      // Update device heartbeat
      await prisma.checkinDevice.update({
        where: { id: deviceId },
        data: {
          lastSeenAt: new Date(),
          status: "ONLINE"
        }
      });

      // Broadcast changes to trigger SSE client updates
      if (processedCount > 0) {
        sendSSEUpdate(tenantId);
      }

      return NextResponse.json({
        status: "success",
        processedCount
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Device sync POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Read auth parameters from headers or query parameters
    const deviceId = request.headers.get("x-device-id") || request.nextUrl.searchParams.get("deviceId");
    const deviceToken = request.headers.get("x-device-token") || request.nextUrl.searchParams.get("deviceToken");

    if (!deviceId || !deviceToken) {
      return NextResponse.json({ error: "deviceId and deviceToken are required" }, { status: 400 });
    }

    // Authorize device
    const device = await prisma.checkinDevice.findUnique({
      where: { id: deviceId }
    });

    if (!device || !device.active) {
      return NextResponse.json({ error: "Unauthorized or inactive device" }, { status: 401 });
    }

    const hashedToken = crypto.createHash("sha256").update(deviceToken).digest("hex");
    if (device.tokenHash !== hashedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch active bookings for the next 24 hours (including starting 2 hours ago)
    const now = new Date();
    const startBound = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const endBound = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId: device.tenantId,
        status: "CONFIRMED",
        reservedFrom: {
          gte: startBound
        },
        reservedTo: {
          lte: new Date(endBound.getTime() + 4 * 60 * 60 * 1000) // generous padding for checkout
        }
      },
      select: {
        id: true,
        userName: true,
        userEmail: true,
        reservedFrom: true,
        reservedTo: true,
        status: true,
        resource: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Update device heartbeat
    await prisma.checkinDevice.update({
      where: { id: deviceId },
      data: {
        lastSeenAt: new Date(),
        status: "ONLINE"
      }
    });

    // Create a cryptographically signed payload using the device's token
    const payloadString = JSON.stringify(bookings);
    const signature = crypto.createHmac("sha256", deviceToken).update(payloadString).digest("hex");

    return NextResponse.json({
      status: "success",
      bookings,
      signature,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error("Device sync GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
