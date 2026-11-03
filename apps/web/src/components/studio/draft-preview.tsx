import type { CourseManifestV1 } from "@platform/contracts";
import { SafeMarkdown } from "../learning/safe-markdown";
import { YouTubeVideo } from "../learning/youtube-video";
import { normalizeYouTubeVideoId } from "@platform/contracts";
import { Badge, EmptyState, Eyebrow, Heading, Text } from "@platform/ui";
import reading from "../learning/learning.module.css";
import styles from "./studio.module.css";
/** Author-only working document preview; no learner writes or protected answer rendering. */
export function DraftPreview({ document }: { document: CourseManifestV1 }) {
  return (
    <section aria-label="Предпросмотр курса" className={styles.preview}>
      <header className={styles.previewHeading}>
        <Eyebrow>Предпросмотр рабочей копии</Eyebrow>
        <Heading level={2} size="section">
          {document.course.title}
        </Heading>
        <Text muted>{document.course.description}</Text>
      </header>
      {!document.lessons.length && (
        <EmptyState title="Пока нет уроков">
          Добавьте первый урок в ручном редакторе или JSON, затем проверьте
          документ.
        </EmptyState>
      )}
      {document.lessons.map((l, i) => (
        <article key={i} className={styles.previewLesson}>
          <Eyebrow>
            Урок {i + 1} · {l.durationMinutes} мин.
          </Eyebrow>
          <Heading level={3} size="section">
            {l.title}
          </Heading>
          <Text muted>{l.summary}</Text>
          {l.blocks.map((b, j) =>
            b.type === "youtube" ? (
              <PreviewVideo key={`${j}/${b.videoId}`} source={b.videoId} title={l.title} />
            ) : b.type === "markdown" ? (
              <div
                key={j}
                className={`${styles.previewNotes} ${reading.markdown}`}
              >
                <SafeMarkdown>{b.markdown}</SafeMarkdown>
              </div>
            ) : (
              <section key={j} className={styles.previewActivity}>
                <div className={styles.statusLine}>
                  <Badge tone="accent">
                    {b.kind === "homework" ? "Домашнее задание" : "Практика"} ·{" "}
                    {b.required ? "Обязательное" : "Для закрепления"}
                  </Badge>
                </div>
                {(() => {
                  const a = document.activities.find(
                    (a) => a.slug === b.activitySlug
                  );
                  if (!a) return <p>Задание «{b.activitySlug}» не найдено в курсе.</p>;
                  return (
                    <>
                      <h4>{b.title ?? a.title}</h4>
                      <div className={reading.markdown}>
                        <SafeMarkdown>{a.instructions}</SafeMarkdown>
                        <SafeMarkdown>{a.presentation.question}</SafeMarkdown>
                      </div>
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

function PreviewVideo({ source, title }: { source: string; title: string }) {
  const videoId = normalizeYouTubeVideoId(source);
  return videoId ? (
    <YouTubeVideo videoId={videoId} title={title} />
  ) : (
    <p>Добавьте корректную ссылку YouTube, чтобы посмотреть видео.</p>
  );
}
