import { Alert, Card, Grid, Skeleton, Stack, Text } from "@platform/ui";
import { loadLearningCatalog } from "../../lib/public-learning";
import { CourseList } from "./course-list";
import { CatalogRetry } from "./catalog-retry";

export function CatalogLoading() {
  return (
    <div aria-busy="true" aria-label="Загрузка курсов">
      <Text muted size="sm" role="status">
        Загружаем курсы…
      </Text>
      <Grid>
        {[1, 2, 3].map((key) => (
          <Card key={key} appearance="quiet">
            <Stack>
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </Stack>
          </Card>
        ))}
      </Grid>
    </div>
  );
}

export async function HomeCatalog() {
  let catalog;
  try {
    catalog = await loadLearningCatalog();
  } catch {
    // An unavailable API is not an empty catalog. Keep the cover usable and
    // expose only a generic read failure, never backend details or fixtures.
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
  return <CourseList courses={catalog.courses} />;
}
