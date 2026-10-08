import { LearningShell } from "../../components/learning/learning-shell";
import { CatalogLoading } from "../../components/learning/home-catalog";
import { LearningPageHeading } from "../../components/learning/learning-page-heading";
export default function Loading() {
  return (
    <LearningShell>
      <LearningPageHeading
        eyebrow="Каталог"
        title="Найдите свою следующую тему."
        description="Бесплатные курсы с видео, понятными конспектами и заданиями для закрепления."
      />
      <CatalogLoading />
    </LearningShell>
  );
}
