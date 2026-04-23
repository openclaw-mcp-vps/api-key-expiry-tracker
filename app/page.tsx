import Link from "next/link";
import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, ShieldCheck, Webhook } from "lucide-react";

import { UnlockAccessForm } from "@/components/UnlockAccessForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const problems = [
  "Keys expire silently while teams focus on feature delivery.",
  "Credential rotation ownership is spread across teams and runbooks.",
  "Alerts arrive too late, after a critical integration has already failed."
];

const solutions = [
  {
    title: "Unified expiry inventory",
    description:
      "Track every production API key in one place with service name, owner metadata, and precise expiration dates.",
    icon: CalendarClock
  },
  {
    title: "Reminder escalation",
    description:
      "Configure reminder cadence like 30/14/7/1 days and deliver alerts through email plus incident webhooks.",
    icon: BellRing
  },
  {
    title: "Outage prevention dashboard",
    description:
      "See expiring keys sorted by risk, then rotate proactively before customer traffic is impacted.",
    icon: ShieldCheck
  }
];

const faqItems = [
  {
    question: "Do I need to store full API secrets?",
    answer:
      "No. The tracker is designed for metadata-first operations. Store a key name and safe reference so teams can rotate from your secret manager."
  },
  {
    question: "How do reminders get triggered?",
    answer:
      "The app can dispatch reminders through email and webhooks based on your configured day thresholds. You can run checks manually or schedule the endpoint with a cron job."
  },
  {
    question: "How does paywall access work?",
    answer:
      "After Stripe checkout, enter the same purchase email on this page. The app verifies payment and stores a secure cookie to unlock the dashboard."
  },
  {
    question: "Who is this built for?",
    answer:
      "DevOps engineers, platform teams, and startup CTOs who need predictable API credential hygiene without building an internal tracker."
  }
];

export default function HomePage() {
  const stripePaymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 pb-16 pt-10 md:px-10">
      <section className="rounded-2xl border border-cyan-900/40 bg-slate-950/70 p-8 shadow-2xl shadow-cyan-950/20 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-800/50 bg-cyan-950/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-200">
              DevOps Tooling • $25/month
            </p>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
                Never let API keys expire unexpectedly
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
                API Key Expiry Tracker gives your team one reliable view of expiring credentials across cloud and SaaS services,
                with renewal reminders before incidents happen.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {stripePaymentLink ? (
                <Button asChild size="lg" className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  <a href={stripePaymentLink} rel="noreferrer" target="_blank">
                    Start protecting production
                  </a>
                </Button>
              ) : (
                <Button size="lg" disabled>
                  Add NEXT_PUBLIC_STRIPE_PAYMENT_LINK to enable checkout
                </Button>
              )}

              <Button asChild size="lg" variant="secondary">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>

            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Multi-service expiration tracking
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Email + webhook renewal reminders
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Cookie-based paid dashboard access
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Built for lean engineering teams
              </p>
            </div>
          </div>

          <UnlockAccessForm />
        </div>
      </section>

      <section className="mt-12 grid gap-5 md:grid-cols-3">
        {problems.map((problem) => (
          <Card key={problem} className="border-red-900/40 bg-red-950/20">
            <CardContent className="p-5">
              <p className="flex items-start gap-2 text-sm leading-relaxed text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                {problem}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-12 space-y-5">
        <h2 className="text-2xl font-semibold text-slate-100 md:text-3xl">Built for teams that run production seriously</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {solutions.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.title}>
                <CardContent className="space-y-3 p-5">
                  <Icon className="h-6 w-6 text-cyan-300" />
                  <h3 className="text-lg font-semibold text-slate-100">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-300">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">Pricing</p>
            <h3 className="text-3xl font-semibold text-slate-50">$25/month</h3>
            <p className="text-sm leading-relaxed text-slate-300">
              One flat plan for unlimited tracked keys, reminder automation, and visibility into renewal risk.
            </p>
            <ul className="space-y-2 text-sm text-slate-200">
              <li className="inline-flex w-full items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Unlimited API key records
              </li>
              <li className="inline-flex w-full items-center gap-2">
                <Webhook className="h-4 w-4 text-cyan-300" />
                Incident webhook integrations
              </li>
              <li className="inline-flex w-full items-center gap-2">
                <BellRing className="h-4 w-4 text-cyan-300" />
                Configurable reminder cadence
              </li>
            </ul>
            {stripePaymentLink ? (
              <Button asChild className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                <a href={stripePaymentLink} rel="noreferrer" target="_blank">
                  Buy now on Stripe
                </a>
              </Button>
            ) : (
              <p className="text-xs text-amber-200">Set `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` to enable checkout.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">FAQ</p>
            <div className="space-y-4">
              {faqItems.map((item) => (
                <div key={item.question} className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-100">{item.question}</h4>
                  <p className="text-sm text-slate-300">{item.answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
