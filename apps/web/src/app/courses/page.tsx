import type { Metadata } from "next";
import { brand } from "@platform/brand";
import { LearningShell } from "../../components/learning/learning-shell";
import { Suspense } from "react";
import { CatalogContent } from "../../components/learning/catalog-content";
import {
  CatalogHero,
  CatalogLoading
} from "../../components/learning/home-catalog";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Бесплатные IT-курсы",
  description: `Открытые курсы ${brand.name}: компьютер, браузер, HTML, CSS, JavaScript и SQL с нуля — по порядку, с практикой прямо в браузере.`,
  alternates: { canonical: "/courses" },
  openGraph: { url: "/courses", title: `Бесплатные IT-курсы · ${brand.name}` }
};
export default function CoursesPage() {
  return (
    <LearningShell>
      <CatalogHero />
      <section aria-label="Доступные курсы">
        <Suspense fallback={<CatalogLoading />}>
          <CatalogContent />
        </Suspense>
      </section>
    </LearningShell>
  );
}
