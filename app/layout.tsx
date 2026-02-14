import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TRK Blockchain | Real Cash Game Ecosystem",
  description: "Play Smart. Earn Sustainably. The first no-loss blockchain gaming ecosystem.",
};

import AppProviders from "@/components/providers/AppProviders";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning
        className={`${outfit.variable} ${inter.variable} antialiased bg-background text-foreground min-h-screen selection:bg-primary/20 selection:text-primary`}
      >
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="beforeInteractive"
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
