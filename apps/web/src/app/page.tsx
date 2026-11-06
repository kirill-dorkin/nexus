import type { Metadata } from "next";
import { brand } from "@platform/brand";
import { LearningShell } from "../components/learning/learning-shell";
import { HomeContent } from "../components/learning/home-discovery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Бесплатные IT-курсы с практикой",
  description: `Бесплатный маршрут ${brand.name} «IT с нуля»: компьютер, браузер, HTML, CSS, JavaScript и SQL с живыми примерами и заданиями с мгновенной проверкой.`,
  alternates: { canonical: "/" },
  openGraph: { url: "/" }
};

export default function HomePage() {
  return (
    <LearningShell width="full">
      <HomeContent />
    </LearningShell>
  );
}
