import "./globals.css";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Dest Admin",
  description:
    "Centralized administration for Dest partners, customers, and operations.",
  openGraph: {
    title: "Dest Admin",
    description:
      "Centralized administration for Dest partners, customers, and operations.",
    type: "website",
    url: "https://dest.co.in",
    siteName: "Dest Admin",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dest Admin",
    description:
      "Centralized administration for Dest partners, customers, and operations.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
