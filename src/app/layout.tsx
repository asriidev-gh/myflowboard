import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { branding } from "@/lib/branding";

import "./globals.css";

const fontHeading = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const fontSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: branding.name,
    template: `%s · ${branding.name}`,
  },
  description: branding.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontHeading.variable} ${fontSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
