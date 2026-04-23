"use client";

import { differenceInCalendarDays, format } from "date-fns";
import { AlertTriangle, Clock4, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type TrackedKey } from "@/lib/types";

type KeyListProps = {
  keys: TrackedKey[];
  onDelete: (id: string) => Promise<void>;
  deletingId: string | null;
};

function getExpiryBadge(expiresAt: string) {
  const daysLeft = differenceInCalendarDays(new Date(expiresAt), new Date());

  if (daysLeft < 0) {
    return {
      label: "Expired",
      variant: "danger" as const,
      icon: AlertTriangle
    };
  }

  if (daysLeft <= 7) {
    return {
      label: `${daysLeft}d left`,
      variant: "warning" as const,
      icon: Clock4
    };
  }

  return {
    label: `${daysLeft}d left`,
    variant: "success" as const,
    icon: Clock4
  };
}

export function KeyList({ keys, onDelete, deletingId }: KeyListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracked keys</CardTitle>
        <CardDescription>Sorted by upcoming expiration. Rotate high-risk keys first.</CardDescription>
      </CardHeader>
      <CardContent>
        {keys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 p-6 text-sm text-slate-400">
            No keys tracked yet. Add your first key to start receiving reminders.
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => {
              const badge = getExpiryBadge(key.expires_at);
              const Icon = badge.icon;

              return (
                <div
                  key={key.id}
                  className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-100">{key.service_name}</p>
                      <span className="text-slate-600">/</span>
                      <p className="text-slate-300">{key.key_name}</p>
                      <Badge variant={badge.variant} className="gap-1">
                        <Icon className="h-3.5 w-3.5" />
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>Expires {format(new Date(key.expires_at), "PPP")}</span>
                      {key.key_reference ? <span>Ref {key.key_reference}</span> : null}
                      {key.notes ? <span>{key.notes}</span> : null}
                    </div>
                  </div>

                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === key.id}
                      onClick={() => void onDelete(key.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      {deletingId === key.id ? "Removing..." : "Remove"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
