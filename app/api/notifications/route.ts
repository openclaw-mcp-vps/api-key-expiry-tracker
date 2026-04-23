import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getNotificationSettings, upsertNotificationSettings } from "@/lib/db";
import { dispatchExpiringNotificationsForOwner } from "@/lib/notifications";
import { getSessionIdFromRequest, isPaidRequest } from "@/lib/session";

const settingsSchema = z.object({
  email: z.string().email().optional().nullable().or(z.literal("")),
  webhookUrl: z.string().url().optional().nullable().or(z.literal("")),
  reminderDays: z.array(z.number().int().min(0).max(365)).min(1).max(12),
  notificationsEnabled: z.boolean()
});

function requireAccess(request: NextRequest) {
  const ownerId = getSessionIdFromRequest(request);

  if (!ownerId) {
    return { error: NextResponse.json({ error: "Missing session cookie" }, { status: 401 }) };
  }

  if (!isPaidRequest(request)) {
    return { error: NextResponse.json({ error: "This feature requires an active subscription" }, { status: 402 }) };
  }

  return { ownerId };
}

export async function GET(request: NextRequest) {
  const access = requireAccess(request);
  if ("error" in access) {
    return access.error;
  }

  try {
    const settings = await getNotificationSettings(access.ownerId);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = requireAccess(request);
  if ("error" in access) {
    return access.error;
  }

  try {
    const body = await request.json();
    const payload = settingsSchema.parse(body);

    const settings = await upsertNotificationSettings(access.ownerId, {
      email: payload.email || null,
      webhookUrl: payload.webhookUrl || null,
      reminderDays: Array.from(new Set(payload.reminderDays)).sort((a, b) => b - a),
      notificationsEnabled: payload.notificationsEnabled
    });

    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request payload", issues: error.issues }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const access = requireAccess(request);
  if ("error" in access) {
    return access.error;
  }

  try {
    const summary = await dispatchExpiringNotificationsForOwner(access.ownerId);
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to dispatch notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
