import type { CourseManifestV1 } from "@platform/contracts";
import { SafeMarkdown } from "../learning/safe-markdown";
import styles from "./studio.module.css";
/** Author-only working document preview; no learner writes or protected answer rendering. */
export function DraftPreview({ document }: { document: CourseManifestV1 }) {
  return (
    <section aria-label="Предпросмотр курса" className={styles.sections}>
      <h2>{document.course.title}</h2>
      <p>{document.course.description}</p>
      {document.lessons.map((l, i) => (
        <article key={i} className={styles.card}>
          <h3>{l.title}</h3>
          <p>
            {l.summary} · {l.durationMinutes} мин.
          </p>
          {l.blocks.map((b, j) =>
            b.type === "youtube" ? (
              <div key={j} className={styles.video}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${b.videoId}`}
                  title={`Видео: ${l.title} (${j + 1})`}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : b.type === "markdown" ? (
              <SafeMarkdown key={j}>{b.markdown}</SafeMarkdown>
            ) : (
              <section key={j}>
                <p>
                  {b.kind === "homework" ? "Домашнее задание" : "Практика"} ·{" "}
                  {b.required ? "Обязательное" : "Для закрепления"}
                </p>
                {(() => {
                  const a = document.activities.find(
                    (a) => a.slug === b.activitySlug
                  )!;
                  return (
                    <>
                      <h4>{b.title ?? a.title}</h4>
                      <SafeMarkdown>{a.instructions}</SafeMarkdown>
                      <SafeMarkdown>{a.presentation.question}</SafeMarkdown>
                      {a.type === "quiz.short_text" ? (
                        <p>Поле короткого ответа</p>
                      ) : (
                        <ul>
                          {a.presentation.options.map((o, k) => (
                            <li key={k}>{o.text}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  );
                })()}
              </section>
            )
          )}
        </article>
      ))}
    </section>
  );
}
