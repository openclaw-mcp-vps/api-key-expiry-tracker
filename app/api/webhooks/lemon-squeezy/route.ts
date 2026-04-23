import { NextRequest, NextResponse } from "next/server";

import { handleStripeEvent, verifyStripeWebhook } from "@/lib/lemon-squeezy";

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  try {
    const event = verifyStripeWebhook(payload, signature);
    const result = await handleStripeEvent(event);

    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
