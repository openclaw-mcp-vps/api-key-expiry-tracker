"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UnlockAccessForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/paywall/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to unlock access");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Unlock failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-100">Already purchased?</p>
        <p className="text-xs text-slate-400">
          Enter the checkout email to activate dashboard access in this browser.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="unlockEmail">Purchase email</Label>
        <Input
          id="unlockEmail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <Button onClick={() => void handleUnlock()} disabled={isSubmitting || !email} className="w-full">
        {isSubmitting ? "Verifying purchase..." : "Unlock dashboard"}
      </Button>
    </div>
  );
}
