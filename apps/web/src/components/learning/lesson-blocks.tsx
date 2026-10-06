import { QuizForm } from "./quiz-form";
import type { PublicLearningLesson } from "@platform/contracts";
import { SafeMarkdown } from "./safe-markdown";
import styles from "./learning.module.css";
export function LessonBlocks({
  lesson,
  organizationSlug,
  offeringSlug
}: {
  lesson: PublicLearningLesson["lesson"];
  organizationSlug: string;
  offeringSlug: string;
}) {
  return (
    <div className={styles.blocks}>
      {lesson.blocks.map((block, index) => {
        if (block.type === "youtube")
          return (
            <section
              key={index}
              aria-label="Видео урока"
              className={styles.video}
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${block.videoId}`}
                title={`Видео: ${lesson.title} (${index + 1})`}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </section>
          );
        if (block.type === "markdown")
          return (
            <section key={index} className={styles.notes} aria-label="Конспект">
              <SafeMarkdown>{block.markdown}</SafeMarkdown>
            </section>
          );
        return (
          <section key={index} className={styles.practice}>
            <p className={styles.eyebrow}>
              {block.kind === "homework" ? "Домашнее задание" : "Практика"} ·{" "}
              {block.required ? "Обязательное задание" : "Для закрепления"}
            </p>
            <h2>{block.title ?? block.activity.title}</h2>
            {block.activity.instructions ? (
              <SafeMarkdown>{block.activity.instructions}</SafeMarkdown>
            ) : null}
            <SafeMarkdown>{block.activity.question}</SafeMarkdown>
            <QuizForm
              activity={block.activity}
              organizationSlug={organizationSlug}
              offeringSlug={offeringSlug}
              lessonSlug={lesson.slug}
            />
          </section>
        );
      })}
    </div>
  );
}
