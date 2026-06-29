import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      // @ts-ignore
      apiVersion: "2024-12-19.acacia",
    })
  : null;

export const isStripeConfigured = () => {
  return !!stripeSecretKey && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
};
