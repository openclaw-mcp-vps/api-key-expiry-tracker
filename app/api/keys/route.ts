import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { deleteKeyForOwner, insertKeyForOwner, listKeysByOwner } from "@/lib/db";
import { getSessionIdFromRequest, isPaidRequest } from "@/lib/session";

const keyPayloadSchema = z.object({
  serviceName: z.string().min(2).max(100),
  keyName: z.string().min(2).max(120),
  keyReference: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  expiresAt: z.string().datetime()
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
    const keys = await listKeysByOwner(access.ownerId);
    return NextResponse.json({ keys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch keys";
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
    const payload = keyPayloadSchema.parse(body);
    const key = await insertKeyForOwner(access.ownerId, payload);

    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request payload", issues: error.issues }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to create key";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = requireAccess(request);
  if ("error" in access) {
    return access.error;
  }

  try {
    let keyId = request.nextUrl.searchParams.get("id");

    if (!keyId) {
      const body = await request.json().catch(() => null);
      keyId = body?.id;
    }

    if (!keyId) {
      return NextResponse.json({ error: "Key id is required" }, { status: 400 });
    }

    const deleted = await deleteKeyForOwner(access.ownerId, keyId);
    if (!deleted) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete key";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
