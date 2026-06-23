import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { makeErrorResponse } from "@/lib/errors";
import { triggerBookingUpdate } from "@/lib/pusher";
import { sendSSEUpdate } from "@/lib/sse";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, cardName, cardNumber, expiry, cvv } = body;

    if (!bookingId || !cardName || !cardNumber || !expiry || !cvv) {
      return makeErrorResponse("MISSING_PARAMETER", "Všechny platební údaje jsou povinné.");
    }

    // Basic mock card format check
    const cleanCard = cardNumber.replace(/\s+/g, "");
    if (cleanCard.length < 15 || cleanCard.length > 16 || isNaN(Number(cleanCard))) {
      return makeErrorResponse("INVALID_TIME_FORMAT", "Neplatné číslo platební karty."); // Reusing error type or message
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true },
    });

    if (!booking) {
      return makeErrorResponse("RESOURCE_NOT_FOUND", "Rezervace nebyla nalezena.");
    }

    if (booking.status === "CONFIRMED" || booking.status === "ATTENDED") {
      return NextResponse.json({
        status: "success",
        message: "Rezervace již byla zaplacena.",
        bookingId,
      });
    }

    if (booking.status !== "PENDING_PAYMENT") {
      return makeErrorResponse("INVALID_TIME_RANGE", "Rezervace není ve stavu čekajícím na platbu.");
    }

    // Generate mock transaction ID
    const txId = "tx_mock_" + crypto.randomBytes(8).toString("hex");

    // Calculate cut amount
    const tenantCutPercent = booking.tenant.paymentCut !== null && booking.tenant.paymentCut !== undefined ? booking.tenant.paymentCut : 3;
    const bookingPrice = Number(booking.price || 0);
    const cutAmount = (bookingPrice * tenantCutPercent) / 100;

    // Update booking to CONFIRMED
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        paymentTransactionId: txId,
        paymentCutAmount: cutAmount,
      },
    });

    // Trigger real-time updates for calendar and admin dashboards
    await triggerBookingUpdate(updatedBooking.tenantId);
    sendSSEUpdate(updatedBooking.tenantId);

    return NextResponse.json({
      status: "success",
      message: "Platba byla úspěšně zpracována.",
      bookingId: updatedBooking.id,
      transactionId: txId,
    });
  } catch (error: any) {
    console.error("Payment API error:", error);
    return makeErrorResponse("DATABASE_ERROR", "Nastala neočekávaná chyba při zpracování platby.", {}, 500);
  }
}
