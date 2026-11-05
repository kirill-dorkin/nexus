import { LearningShell } from "../../components/learning/learning-shell";
import {
  CatalogHero,
  CatalogLoading
} from "../../components/learning/home-catalog";
export default function Loading() {
  return (
    <LearningShell>
      <CatalogHero />
      <CatalogLoading />
    </LearningShell>
  );
}
