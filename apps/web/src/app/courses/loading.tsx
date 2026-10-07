import { Surface } from "@platform/ui";
import { LearningShell } from "../../components/learning/learning-shell";
import { LearningLoading } from "../../components/learning/learning-loading";
export default function Loading() {
  return (
    <LearningShell>
      <Surface>
        <LearningLoading>Загружаем курсы…</LearningLoading>
      </Surface>
    </LearningShell>
  );
}
