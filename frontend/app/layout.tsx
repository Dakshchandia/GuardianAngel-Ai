import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "GuardianAngel AI — Real-Time Scam Protection",
  description:
    "AI-powered real-time protection against voice cloning scams, deepfake calls, and emotional manipulation. Built for India.",
  keywords: "AI scam protection, voice clone detection, deepfake detection, cybersecurity, India",
  authors: [{ name: "Team Pillars — Daksh Chandia & Aarushi Singh" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "GuardianAngel AI",
    description: "Real-Time AI Scam Protection",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0E1A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-text-primary font-body antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#111827",
              color: "#E2E8F0",
              border: "1px solid rgba(0, 212, 255, 0.2)",
            },
            success: {
              iconTheme: { primary: "#00E676", secondary: "#111827" },
            },
            error: {
              iconTheme: { primary: "#FF3B3B", secondary: "#111827" },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
