import { Alert, Skeleton, Stack, Text } from "@platform/ui";
import { loadLearningCatalog } from "../../lib/public-learning";
import { CourseList } from "./course-list";
import { LearningPageHeading } from "./learning-page-heading";
import { CatalogRetry } from "./catalog-retry";
import styles from "./course-list.module.css";
import flow from "./flow.module.css";

/** The /courses heading; the page and its loading state share it so it never changes under the reader. */
export function CatalogHero() {
  return (
    <div className={flow.catalogHero}>
      <LearningPageHeading
        eyebrow="Каталог"
        title="Веб-разработка с нуля: четыре курса по порядку."
        description="HTML, затем CSS, JavaScript и SQL. Каждый курс говорит, что нужно знать до него и что вы будете уметь после."
      />
      <aside className={flow.catalogPromise} aria-label="Как устроено обучение">
        <strong>Сначала посмотрите программу.</strong>
        <p>
          Материалы открыты без регистрации. Аккаунт понадобится, только когда
          вы захотите сохранять результаты и продолжать с нужного места.
        </p>
      </aside>
    </div>
  );
}

/**
 * Stands in for CatalogResults while the catalog streams: the same search row
 * and course-card boxes, so the list replaces them in place. A shorter
 * placeholder let the footer into the first screen and the arriving list then
 * pushed it out, a layout shift of ~0.1 on /courses.
 */
export function CatalogLoading() {
  return (
    <div aria-busy="true" aria-label="Загрузка курсов">
      <div className={flow.catalogSearch}>
        <div className="ui-field" aria-hidden="true">
          <span className="ui-label">Поиск по каталогу</span>
          <Skeleton className={styles.searchSkeleton} />
        </div>
        <Text muted size="sm" role="status">
          Загружаем курсы…
        </Text>
      </div>
      <ul className={styles.list} aria-hidden="true">
        {[1, 2, 3].map((key) => (
          <li key={key}>
            <div className={`${styles.card} ${styles.cardSkeleton}`}>
              <div className={styles.cover} />
              <div className={styles.body}>
                <Skeleton />
                <Skeleton className={styles.titleSkeleton} />
                <Skeleton />
                <Skeleton />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
export async function HomeCatalog() {
  let catalog;
  try {
    catalog = await loadLearningCatalog();
  } catch {
    return (
      <Alert tone="warning" title="Каталог временно недоступен">
        <Stack gap="sm">
          <Text size="sm">
            Не удалось загрузить курсы. Попробуйте ещё раз чуть позже.
          </Text>
          <CatalogRetry />
        </Stack>
      </Alert>
    );
  }
  return <CourseList courses={catalog.courses.slice(0, 3)} />;
}
