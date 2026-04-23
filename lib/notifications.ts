import nodemailer from "nodemailer";
import { differenceInCalendarDays, formatDistanceToNowStrict } from "date-fns";

import {
  getNotificationSettings,
  hasNotificationEvent,
  listKeysByOwner,
  recordNotificationEvent,
  type ApiKeyRecord
} from "@/lib/db";

type NotificationDispatchSummary = {
  ownerId: string;
  checkedKeys: number;
  emailSent: number;
  webhookSent: number;
  skipped: number;
  errors: string[];
};

function getSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

function buildSubject(key: ApiKeyRecord, dayThreshold: number) {
  return dayThreshold === 0
    ? `API key expired: ${key.service_name} / ${key.key_name}`
    : `API key expires in ${dayThreshold} day${dayThreshold === 1 ? "" : "s"}: ${key.service_name}`;
}

function buildBody(key: ApiKeyRecord, dayThreshold: number) {
  const expiryDate = new Date(key.expires_at);
  const relative = formatDistanceToNowStrict(expiryDate, { addSuffix: true });

  return [
    `Service: ${key.service_name}`,
    `Key: ${key.key_name}`,
    `Reference: ${key.key_reference ?? "N/A"}`,
    `Expires at: ${expiryDate.toISOString()}`,
    `Time remaining: ${relative}`,
    "",
    dayThreshold === 0
      ? "This key is already expired. Rotate it immediately to avoid production impact."
      : `This is your ${dayThreshold}-day reminder to renew or rotate the key.`,
    "",
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard`
  ].join("\n");
}

async function sendEmailNotification(
  email: string,
  key: ApiKeyRecord,
  dayThreshold: number
): Promise<{ ok: boolean; error?: string }> {
  const transport = getSmtpTransport();
  const from = process.env.SMTP_FROM;

  if (!transport || !from) {
    return {
      ok: false,
      error: "SMTP transport is not configured."
    };
  }

  try {
    await transport.sendMail({
      from,
      to: email,
      subject: buildSubject(key, dayThreshold),
      text: buildBody(key, dayThreshold)
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email dispatch failed";
    return { ok: false, error: message };
  }
}

async function sendWebhookNotification(
  webhookUrl: string,
  ownerId: string,
  key: ApiKeyRecord,
  dayThreshold: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: "api_key_expiry_reminder",
        ownerId,
        reminderDays: dayThreshold,
        key: {
          id: key.id,
          serviceName: key.service_name,
          keyName: key.key_name,
          keyReference: key.key_reference,
          expiresAt: key.expires_at
        }
      })
    });

    if (!response.ok) {
      return { ok: false, error: `Webhook failed with status ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook dispatch failed";
    return { ok: false, error: message };
  }
}

export async function dispatchExpiringNotificationsForOwner(ownerId: string): Promise<NotificationDispatchSummary> {
  const [settings, keys] = await Promise.all([getNotificationSettings(ownerId), listKeysByOwner(ownerId)]);

  const summary: NotificationDispatchSummary = {
    ownerId,
    checkedKeys: keys.length,
    emailSent: 0,
    webhookSent: 0,
    skipped: 0,
    errors: []
  };

  if (!settings.notifications_enabled) {
    summary.skipped = keys.length;
    return summary;
  }

  const normalizedThresholds = Array.from(new Set(settings.reminder_days)).filter((day) => day >= 0);

  for (const key of keys) {
    const daysUntilExpiry = differenceInCalendarDays(new Date(key.expires_at), new Date());
    const threshold = normalizedThresholds.find((value) => value === daysUntilExpiry);

    if (threshold === undefined) {
      summary.skipped += 1;
      continue;
    }

    if (settings.email) {
      const alreadySentEmail = await hasNotificationEvent(ownerId, key.id, threshold, "email");

      if (!alreadySentEmail) {
        const emailResult = await sendEmailNotification(settings.email, key, threshold);

        if (emailResult.ok) {
          await recordNotificationEvent(ownerId, key.id, threshold, "email");
          summary.emailSent += 1;
        } else if (emailResult.error) {
          summary.errors.push(emailResult.error);
        }
      }
    }

    if (settings.webhook_url) {
      const alreadySentWebhook = await hasNotificationEvent(ownerId, key.id, threshold, "webhook");

      if (!alreadySentWebhook) {
        const webhookResult = await sendWebhookNotification(settings.webhook_url, ownerId, key, threshold);

        if (webhookResult.ok) {
          await recordNotificationEvent(ownerId, key.id, threshold, "webhook");
          summary.webhookSent += 1;
        } else if (webhookResult.error) {
          summary.errors.push(webhookResult.error);
        }
      }
    }
  }

  return summary;
}
