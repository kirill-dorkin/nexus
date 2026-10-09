import { LearningShell } from "../../components/learning/learning-shell";
import { CatalogLoading } from "../../components/learning/home-catalog";
import { LearningPageHeading } from "../../components/learning/learning-page-heading";
import styles from "../../components/learning/flow.module.css";
export default function Loading() {
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
      <CatalogLoading />
    </LearningShell>
  );
}
