import { Alert, Stack, Text } from "@platform/ui";
import { loadLearningCatalog } from "../../lib/public-learning";
import { CatalogResults } from "./catalog-results";
import { CatalogRetry } from "./catalog-retry";
export async function CatalogContent() {
  let catalog;
  try {
    catalog = await loadLearningCatalog();
  } catch {
    return (
      <Alert tone="warning" title="Каталог временно недоступен">
        <Stack gap="sm">
          <Text>
            Не удалось загрузить курсы. Попробуйте ещё раз чуть позже.
          </Text>
          <CatalogRetry />
        </Stack>
      </Alert>
    );
  }
  return <CatalogResults courses={catalog.courses} />;
}
