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
  description: `Открытые курсы ${brand.name}: HTML, CSS, JavaScript и SQL с нуля — по порядку, с практикой прямо в браузере.`,
  alternates: { canonical: "/courses" },
  openGraph: { url: "/courses", title: `Бесплатные IT-курсы · ${brand.name}` }
};
export default function CoursesPage() {
  return (
    <LearningShell>
      <div className={styles.catalogHero}>
        <LearningPageHeading
          eyebrow="Каталог"
          title="Веб-разработка с нуля: четыре курса по порядку."
          description="HTML, затем CSS, JavaScript и SQL. Каждый курс говорит, что нужно знать до него и что вы будете уметь после."
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
