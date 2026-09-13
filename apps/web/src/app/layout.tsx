import type { Metadata } from "next";
import type { ReactNode } from "react";
import { brand } from "@platform/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`
  },
  description: brand.tagline
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
