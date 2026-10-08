import type { Metadata } from "next";
import type { ReactNode } from "react";
import { brand } from "@platform/brand";
import { appearanceBootScript } from "../components/appearance/preferences";
import "@fontsource-variable/onest";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`
  },
  description: brand.tagline
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
