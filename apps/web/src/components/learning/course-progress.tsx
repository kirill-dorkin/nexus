import type { LearnerLearningCourse } from "@platform/contracts";
import { Badge, Progress, Text } from "@platform/ui";
import styles from "./flow.module.css";
export function CourseProgress({
  learning
}: {
  learning: LearnerLearningCourse;
}) {
  const p = learning.progress;
  if (!p) return null;
  return (
    <div className={styles.progress}>
      {p.percentage === null ? (
        <Text size="sm" muted>
          В этом курсе нет обязательных заданий. Материалы доступны для чтения.
        </Text>
      ) : (
        <>
          <Progress
            value={p.percentage}
            label={`Задания курса: ${p.passedRequired} из ${p.totalRequired}`}
          />
          {p.allRequiredPassed && (
            <Badge tone="success">
              Все обязательные задания курса выполнены.
            </Badge>
          )}
        </>
      )}
      {learning.entry.enrollmentStatus === "completed" && (
        <Badge tone="success">Обучение завершено.</Badge>
      )}
      {p.lastActionAt && (
        <Text muted size="sm">
          Последняя практика: {new Date(p.lastActionAt).toLocaleString("ru-RU")}
        </Text>
      )}
    </div>
  );
}
