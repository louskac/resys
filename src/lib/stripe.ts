import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

export const isStripeConfigured = () => {
  return !!stripeSecretKey && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
};
