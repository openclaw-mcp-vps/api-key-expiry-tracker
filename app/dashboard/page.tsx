"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { CalendarClock, ShieldAlert } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { KeyForm } from "@/components/KeyForm";
import { KeyList } from "@/components/KeyList";
import { NotificationSettings } from "@/components/NotificationSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type TrackedKey } from "@/lib/types";

type DashboardStats = {
  total: number;
  expiringSoon: number;
  expired: number;
};

function buildStats(keys: TrackedKey[]): DashboardStats {
  let expiringSoon = 0;
  let expired = 0;

  for (const key of keys) {
    const daysLeft = differenceInCalendarDays(new Date(key.expires_at), new Date());

    if (daysLeft < 0) {
      expired += 1;
    } else if (daysLeft <= 14) {
      expiringSoon += 1;
    }
  }

  return {
    total: keys.length,
    expiringSoon,
    expired
  };
}

export default function DashboardPage() {
  const [keys, setKeys] = useState<TrackedKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void refreshKeys();
  }, []);

  async function refreshKeys() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/keys", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load keys");
      }

      setKeys(data.keys as TrackedKey[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete key");
      }

      setKeys((current) => current.filter((key) => key.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete key");
    } finally {
      setDeletingId(null);
    }
  }

  const stats = useMemo(() => buildStats(keys), [keys]);

  const chartData = useMemo(
    () =>
      keys.slice(0, 8).map((key) => ({
        name: `${key.service_name}:${key.key_name}`,
        daysLeft: differenceInCalendarDays(new Date(key.expires_at), new Date())
      })),
    [keys]
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 pb-16 pt-8 md:px-10">
      <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">API Key Expiry Tracker</p>
          <h1 className="text-3xl font-semibold text-slate-100 md:text-4xl">Expiry dashboard</h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Centralized visibility for key rotation. Track upcoming expirations, configure reminders, and prevent outages.
          </p>
        </div>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total tracked keys</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Expiring in 14 days</CardDescription>
            <CardTitle className="text-3xl text-amber-200">{stats.expiringSoon}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Already expired</CardDescription>
            <CardTitle className="text-3xl text-red-300">{stats.expired}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Expiry risk timeline</CardTitle>
            <CardDescription>Next 8 keys by urgency. Negative values indicate keys that are already expired.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  cursor={{ fill: "rgba(30, 41, 59, 0.6)" }}
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                />
                <Bar dataKey="daysLeft" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <KeyForm
            onCreated={(key) => {
              setKeys((current) => [key, ...current].sort((a, b) => +new Date(a.expires_at) - +new Date(b.expires_at)));
            }}
          />

          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-sm text-slate-400">Loading keys...</CardContent>
            </Card>
          ) : (
            <KeyList keys={keys} onDelete={handleDelete} deletingId={deletingId} />
          )}

          {error ? (
            <div className="rounded-lg border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>
          ) : null}
        </div>

        <div className="space-y-8">
          <NotificationSettings />

          <Card className="border-cyan-900/40 bg-cyan-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-200">
                <ShieldAlert className="h-5 w-5" />
                Recommended policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-cyan-100">
              <p className="flex items-start gap-2">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                Keep reminder cadence at 30, 14, 7, 3, and 1 days for production keys.
              </p>
              <p className="flex items-start gap-2">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                Add a webhook destination tied to your incident channel for fast escalation.
              </p>
              <p className="flex items-start gap-2">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                Use runbook notes in each key record to reduce on-call scramble during rotation.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
