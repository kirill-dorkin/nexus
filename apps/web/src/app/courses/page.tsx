import type { Metadata } from "next";
import { brand } from "@platform/brand";
import { LearningShell } from "../../components/learning/learning-shell";
import { Suspense } from "react";
import { CatalogContent } from "../../components/learning/catalog-content";
import { CatalogLoading } from "../../components/learning/home-catalog";
import { LearningPageHeading } from "../../components/learning/learning-page-heading";
import styles from "../../components/learning/flow.module.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Бесплатные IT-курсы",
  description: `Открытые курсы ${brand.name} по компьютерной грамотности и цифровым навыкам: программа, видео, конспекты и практика.`,
  alternates: { canonical: "/courses" },
  openGraph: { url: "/courses", title: `Бесплатные IT-курсы · ${brand.name}` }
};
export default async function CoursesPage() {
  return (
    <LearningShell>
      <div className={styles.catalogHero}>
        <LearningPageHeading
          eyebrow="Каталог"
          title="Выберите навык, который пригодится на практике."
          description="Короткие объяснения, видео и задания — в понятной последовательности и без спешки."
        />
        <aside className={styles.catalogPromise} aria-label="Как устроено обучение">
          <strong>Сначала посмотрите программу.</strong>
          <p>
            Материалы открыты без регистрации. Аккаунт понадобится, только
            когда вы захотите сохранять результаты и продолжать с нужного места.
          </p>
        </aside>
      </div>
      <section aria-label="Доступные курсы">
        <Suspense fallback={<CatalogLoading />}>
          <CatalogContent />
        </Suspense>
      </section>
    </LearningShell>
  );
}
