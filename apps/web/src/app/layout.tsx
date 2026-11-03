import type { Metadata } from "next";
import { brand } from "@platform/brand";
import type { ReactNode } from "react";
import { appearanceBootScript } from "../components/appearance/preferences";
import { siteUrl } from "../lib/site";
import { ClientTelemetry } from "../components/telemetry/client-telemetry";
import "@fontsource-variable/onest";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`
  },
  description:
    "Открытые IT-курсы с видео, понятными конспектами, практикой и сохранением прогресса.",
  applicationName: brand.name,
  authors: [{ name: `Команда ${brand.name}` }],
  creator: `Команда ${brand.name}`,
  publisher: brand.name,
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: brand.name,
    title: `${brand.name} — понятное обучение цифровым навыкам`,
    description: "Открытые IT-курсы с видео, конспектами и практикой."
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} — понятное обучение цифровым навыкам`,
    description: "Открытые IT-курсы с видео, конспектами и практикой."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootScript }} />
      </head>
      <body>
        {children}
        <ClientTelemetry />
      </body>
    </html>
  );
}
