"use client";

import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type TrackedKey } from "@/lib/types";

type KeyFormProps = {
  onCreated: (key: TrackedKey) => void;
};

export function KeyForm({ onCreated }: KeyFormProps) {
  const [serviceName, setServiceName] = useState("");
  const [keyName, setKeyName] = useState("");
  const [keyReference, setKeyReference] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!expiresAt) {
      setError("Pick an expiration date before saving.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          serviceName,
          keyName,
          keyReference,
          notes,
          expiresAt: new Date(`${expiresAt}T00:00:00.000Z`).toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save API key.");
      }

      onCreated(data.key as TrackedKey);
      setServiceName("");
      setKeyName("");
      setKeyReference("");
      setExpiresAt("");
      setNotes("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save API key.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-950/80">
      <CardHeader>
        <CardTitle>Add API key metadata</CardTitle>
        <CardDescription>
          Store service, owner label, and expiration date. Secrets are never required, only key metadata.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Service</Label>
              <Input
                id="serviceName"
                placeholder="AWS IAM, OpenAI, GitHub"
                required
                value={serviceName}
                onChange={(event) => setServiceName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyName">Key name</Label>
              <Input
                id="keyName"
                placeholder="prod-ingest-key"
                required
                value={keyName}
                onChange={(event) => setKeyName(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="keyReference">Key reference</Label>
              <Input
                id="keyReference"
                placeholder="last 6 chars or vault path"
                value={keyReference}
                onChange={(event) => setKeyReference(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration date</Label>
              <Input
                id="expiresAt"
                type="date"
                min={minDate}
                required
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Runbook note</Label>
            <Textarea
              id="notes"
              placeholder="Rotation steps, owner team, linked runbook"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <div className="flex items-center gap-3">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save API key"}
            </Button>
            <p className="text-xs text-slate-400">You can track unlimited keys after purchase.</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
