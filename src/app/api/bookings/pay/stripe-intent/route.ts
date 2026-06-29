import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { makeErrorResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return makeErrorResponse("MISSING_PARAMETER", "Identifikátor rezervace je povinný.");
    }

    // 1. Fetch booking details to get the price and tenant config
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tenant: true },
    });

    if (!booking) {
      return makeErrorResponse("RESOURCE_NOT_FOUND", "Rezervace nebyla nalezena.");
    }

    if (booking.status === "CONFIRMED" || booking.status === "ATTENDED") {
      return NextResponse.json({
        stripeEnabled: false,
        alreadyPaid: true,
        message: "Rezervace již byla zaplacena.",
      });
    }

    if (booking.status !== "PENDING_PAYMENT") {
      return makeErrorResponse("INVALID_PARAMETER", "Rezervace není ve stavu čekajícím na platbu.");
    }

    // 2. Handle zero amount bookings (Stripe requires positive amounts)
    const amount = Number(booking.price || 0);
    if (amount <= 0) {
      return NextResponse.json({
        stripeEnabled: false,
        isZeroAmount: true,
      });
    }

    // 3. Check if Stripe is configured in environment
    if (!isStripeConfigured() || !stripe) {
      return NextResponse.json({
        stripeEnabled: false,
      });
    }

    // 4. Calculate amount in subunits (cents/haléř for CZK)
    const amountInSubunits = Math.round(amount * 100);

    // 5. Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSubunits,
      currency: booking.tenant.currency.toLowerCase() || "czk",
      metadata: {
        bookingId: booking.id,
        tenantId: booking.tenantId,
      },
    });

    return NextResponse.json({
      stripeEnabled: true,
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error: any) {
    console.error("Create Stripe intent failed:", error);
    return makeErrorResponse("DATABASE_ERROR", "Nastala chyba při přípravě platby přes Stripe.", {}, 500);
  }
}
