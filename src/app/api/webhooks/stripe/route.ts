import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { triggerBookingUpdate } from "@/lib/pusher";
import { sendSSEUpdate } from "@/lib/sse";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error("Stripe webhook received but Stripe or webhook secret is not configured.");
    return NextResponse.json({ error: "Stripe configuration missing" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      console.warn("Stripe webhook: payment_intent.succeeded event missing bookingId metadata.");
      return NextResponse.json({ error: "Missing bookingId metadata" }, { status: 400 });
    }

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { tenant: true },
      });

      if (!booking) {
        console.error(`Stripe webhook: Booking ${bookingId} not found in database.`);
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      if (booking.status === "PENDING_PAYMENT") {
        // Calculate platform cut amount
        const tenantCutPercent = booking.tenant.paymentCut !== null && booking.tenant.paymentCut !== undefined ? booking.tenant.paymentCut : 3;
        const bookingPrice = Number(booking.price || 0);
        const cutAmount = (bookingPrice * tenantCutPercent) / 100;

        // Update booking status to CONFIRMED
        const updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
            paymentTransactionId: paymentIntent.id,
            paymentCutAmount: cutAmount,
          },
        });

        // Trigger real-time updates for calendar and admin dashboards
        await triggerBookingUpdate(updatedBooking.tenantId);
        sendSSEUpdate(updatedBooking.tenantId);

        console.log(`Stripe webhook: Booking ${bookingId} successfully confirmed.`);
      } else {
        console.log(`Stripe webhook: Booking ${bookingId} is already in status: ${booking.status}`);
      }
    } catch (dbError) {
      console.error("Stripe webhook database update failed:", dbError);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
