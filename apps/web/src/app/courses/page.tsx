import type { Metadata } from "next";
import { LearningShell } from "../../components/learning/learning-shell";
import { Suspense } from "react";
import { CatalogContent } from "../../components/learning/catalog-content";
import { CatalogLoading } from "../../components/learning/home-catalog";
import { LearningPageHeading } from "../../components/learning/learning-page-heading";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Бесплатные курсы" };
export default async function CoursesPage() {
  return (
    <LearningShell>
      <LearningPageHeading
        eyebrow="Каталог"
        title="Найдите свою следующую тему."
        description="Бесплатные курсы с видео, понятными конспектами и заданиями для закрепления."
      />
      <section aria-label="Доступные курсы">
        <Suspense fallback={<CatalogLoading />}>
          <CatalogContent />
        </Suspense>
      </section>
    </LearningShell>
  );
}
