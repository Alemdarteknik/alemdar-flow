import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/app/providers";
import { MaintenanceOverlay } from "@/components/maintenance-overlay";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solar Inverter Monitor",
  description: "Monitor and manage your customer solar inverter systems",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

const maintenanceFlag = process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
const maintenanceEnabled =
  process.env.NODE_ENV === "production"
    ? maintenanceFlag?.toLowerCase() !== "false"
    : maintenanceFlag?.toLowerCase() === "true";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <Providers>
          {maintenanceEnabled ? <MaintenanceOverlay /> : children}
        </Providers>
        <Toaster position="top-center" />
        <Analytics />
      </body>
    </html>
  );
}
