import type { LearnerLearningCourse } from "@platform/contracts";
import styles from "./learning.module.css";
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
        <p>
          В этом курсе нет обязательных заданий. Материалы доступны для чтения.
        </p>
      ) : (
        <>
          <label
            htmlFor={`progress-${learning.organization.slug}-${learning.offering.slug}`}
          >
            Задания курса: {p.passedRequired} из {p.totalRequired} ·{" "}
            {p.percentage}%
          </label>
          <progress
            id={`progress-${learning.organization.slug}-${learning.offering.slug}`}
            value={p.passedRequired}
            max={p.totalRequired}
          >
            {p.percentage}%
          </progress>
          {p.allRequiredPassed && (
            <p>Все обязательные задания курса выполнены.</p>
          )}
        </>
      )}
      {learning.entry.enrollmentStatus === "completed" && (
        <p>Обучение завершено.</p>
      )}
      {p.lastActionAt && (
        <p className={styles.muted}>
          Последняя практика: {new Date(p.lastActionAt).toLocaleString("ru-RU")}
        </p>
      )}
    </div>
  );
}
