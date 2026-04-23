"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type NotificationSettingsData } from "@/lib/types";

export function NotificationSettings() {
  const [email, setEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [reminderDaysInput, setReminderDaysInput] = useState("30,14,7,3,1");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/notifications", { method: "GET", cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load settings");
        }

        const settings = data.settings as NotificationSettingsData;
        if (!mounted) {
          return;
        }

        setEmail(settings.email ?? "");
        setWebhookUrl(settings.webhook_url ?? "");
        setReminderDaysInput(settings.reminder_days.join(","));
        setNotificationsEnabled(settings.notifications_enabled);
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load settings");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  function parseReminderDays() {
    const values = reminderDaysInput
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((value) => Number.isFinite(value) && value >= 0 && value <= 365);

    const unique = Array.from(new Set(values)).sort((a, b) => b - a);

    if (unique.length === 0) {
      throw new Error("Add at least one reminder day value (example: 30,14,7,1)");
    }

    return unique;
  }

  async function saveSettings() {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const reminderDays = parseReminderDays();

      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          webhookUrl,
          reminderDays,
          notificationsEnabled
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save notification settings");
      }

      const settings = data.settings as NotificationSettingsData;
      setEmail(settings.email ?? "");
      setWebhookUrl(settings.webhook_url ?? "");
      setReminderDaysInput(settings.reminder_days.join(","));
      setNotificationsEnabled(settings.notifications_enabled);
      setMessage("Notification settings updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  async function runDispatchNow() {
    setIsRunning(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/notifications", { method: "PUT" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to run notification check");
      }

      const summary = data.summary as {
        checkedKeys: number;
        emailSent: number;
        webhookSent: number;
        skipped: number;
        errors: string[];
      };

      setMessage(
        `Checked ${summary.checkedKeys} keys. Sent ${summary.emailSent} email and ${summary.webhookSent} webhook reminders. Skipped ${summary.skipped}.`
      );

      if (summary.errors.length > 0) {
        setError(summary.errors.join(" | "));
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Failed to run reminder check");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification settings</CardTitle>
        <CardDescription>
          Send renewal reminders before key expiry through email and operational webhooks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-slate-400">Loading settings...</p> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="notificationEmail">Reminder email</Label>
            <Input
              id="notificationEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="oncall@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reminderDays">Reminder cadence (days before expiry)</Label>
            <Input
              id="reminderDays"
              value={reminderDaysInput}
              onChange={(event) => setReminderDaysInput(event.target.value)}
              placeholder="30,14,7,3,1"
            />
          </div>

          <div className="flex items-end justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">Enable notifications</p>
              <p className="text-xs text-slate-400">Turn off reminders during maintenance windows.</p>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
          </div>
        </div>

        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void saveSettings()} disabled={isLoading || isSaving}>
            {isSaving ? "Saving..." : "Save settings"}
          </Button>
          <Button variant="secondary" onClick={() => void runDispatchNow()} disabled={isLoading || isRunning}>
            {isRunning ? "Running check..." : "Run reminder check now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
