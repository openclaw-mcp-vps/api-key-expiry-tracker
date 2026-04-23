import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono"
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apikeyexpirytracker.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "API Key Expiry Tracker | Never let API keys expire unexpectedly",
    template: "%s | API Key Expiry Tracker"
  },
  description:
    "Track API key expiration dates across cloud providers and SaaS vendors. Get proactive renewal reminders by email and webhook before outages happen.",
  keywords: [
    "api key monitoring",
    "devops tooling",
    "expiration reminders",
    "incident prevention",
    "startup reliability"
  ],
  openGraph: {
    title: "API Key Expiry Tracker",
    description:
      "Prevent downtime from expired API keys with a dashboard built for DevOps engineers and startup CTOs.",
    url: "/",
    siteName: "API Key Expiry Tracker",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "API Key Expiry Tracker",
    description: "Never let API keys expire unexpectedly."
  },
  alternates: {
    canonical: "/"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} bg-[#0d1117] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
