import Stripe from "stripe";

import { upsertPurchase } from "@/lib/db";

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const secret = process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder";
  stripeClient = new Stripe(secret, {
    apiVersion: "2025-02-24.acacia"
  });
  return stripeClient;
}

export function getStripePaymentLink() {
  return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
}

export function verifyStripeWebhook(payload: string, signature: string | null) {
  if (!signature) {
    throw new Error("Missing Stripe signature header.");
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export async function handleStripeEvent(event: Stripe.Event) {
  if (event.type !== "checkout.session.completed") {
    return { handled: false };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email = session.customer_details?.email ?? session.customer_email;

  if (!email) {
    return { handled: false, reason: "No customer email on checkout session" };
  }

  await upsertPurchase({
    email,
    status: "paid",
    stripeEventId: event.id,
    stripeCheckoutSessionId: session.id,
    paidAt: new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString()
  });

  return { handled: true };
}
