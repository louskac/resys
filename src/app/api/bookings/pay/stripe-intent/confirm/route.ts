import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { makeErrorResponse } from "@/lib/errors";
import { triggerBookingUpdate } from "@/lib/pusher";
import { sendSSEUpdate } from "@/lib/sse";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, paymentIntentId } = body;

    if (!bookingId || !paymentIntentId) {
      return makeErrorResponse("MISSING_PARAMETER", "Identifikátor rezervace a platby jsou povinné.");
    }

    if (!isStripeConfigured() || !stripe) {
      return makeErrorResponse("UNKNOWN_ERROR", "Stripe není nakonfigurován.");
    }

    // 1. Retrieve the PaymentIntent from Stripe to verify status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return makeErrorResponse(
        "INVALID_PARAMETER",
        `Platba nebyla dokončena. Stav platby: ${paymentIntent.status}`
      );
    }

    // 2. Security Check: Verify metadata matches the requested bookingId
    if (paymentIntent.metadata?.bookingId !== bookingId) {
      return makeErrorResponse("FORBIDDEN", "Identifikátor rezervace neodpovídá platbě.");
    }

    // 3. Fetch Booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true },
    });

    if (!booking) {
      return makeErrorResponse("RESOURCE_NOT_FOUND", "Rezervace nebyla nalezena.");
    }

    // 4. Confirm booking if it's still pending
    if (booking.status === "PENDING_PAYMENT") {
      const tenantCutPercent = booking.tenant.paymentCut !== null && booking.tenant.paymentCut !== undefined ? booking.tenant.paymentCut : 3;
      const bookingPrice = Number(booking.price || 0);
      const cutAmount = (bookingPrice * tenantCutPercent) / 100;

      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "CONFIRMED",
          paymentTransactionId: paymentIntentId,
          paymentCutAmount: cutAmount,
        },
      });

      // Trigger real-time updates for calendar and admin dashboards
      await triggerBookingUpdate(updatedBooking.tenantId);
      sendSSEUpdate(updatedBooking.tenantId);

      console.log(`Stripe Client-Confirm Backup: Booking ${bookingId} successfully confirmed.`);
    }

    return NextResponse.json({
      status: "success",
      message: "Rezervace byla úspěšně ověřena a potvrzena.",
    });
  } catch (error: any) {
    console.error("Stripe confirm endpoint error:", error);
    return makeErrorResponse("DATABASE_ERROR", "Chyba při ověřování platby na serveru.", {}, 500);
  }
}
