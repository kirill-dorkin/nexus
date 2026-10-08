import { Alert, Skeleton, Stack, Text } from "@platform/ui";
import { loadLearningCatalog } from "../../lib/public-learning";
import { CourseList } from "./course-list";
import { CatalogRetry } from "./catalog-retry";
import styles from "./course-list.module.css";

export function CatalogLoading() {
  return (
    <div aria-busy="true" aria-label="Загрузка курсов">
      <Text muted size="sm" role="status">
        Загружаем курсы…
      </Text>
      <ul className={styles.list} aria-hidden="true">
        {[1, 2, 3].map((key) => (
          <li key={key} className={styles.row}>
            <Skeleton />
            <Stack>
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </Stack>
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
