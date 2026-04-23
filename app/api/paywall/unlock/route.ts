import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { findPurchaseByEmail } from "@/lib/db";
import { PAYWALL_COOKIE_NAME } from "@/lib/session";

const unlockSchema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = unlockSchema.parse(body);
    const purchase = await findPurchaseByEmail(payload.email);

    if (!purchase || purchase.status !== "paid") {
      return NextResponse.json(
        {
          error:
            "No completed purchase found for that email yet. If you just paid, wait 10-20 seconds and try again."
        },
        { status: 404 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: PAYWALL_COOKIE_NAME,
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unlock request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
