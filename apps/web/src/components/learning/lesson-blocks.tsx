import { Badge, Heading, Inline, Stack, Surface } from "@platform/ui";
import { QuizForm } from "./quiz-form";
import type { PublicLearningLesson } from "@platform/contracts";
import { SafeMarkdown } from "./safe-markdown";
import { YouTubeVideo } from "./youtube-video";
import { getPublicLessonVideo } from "./public-lesson-video";
import styles from "./learning.module.css";
export function LessonBlocks({
  lesson,
  organizationSlug,
  offeringSlug,
  courseSlug
}: {
  lesson: PublicLearningLesson["lesson"];
  organizationSlug: string;
  offeringSlug: string;
  courseSlug: string;
}) {
  const publicVideo = lesson.blocks.some((block) => block.type === "youtube")
    ? null
    : getPublicLessonVideo(organizationSlug, offeringSlug, lesson.slug);

  return (
    <div className={styles.blocks}>
      {publicVideo ? (
        <YouTubeVideo
          videoId={publicVideo.videoId}
          title={publicVideo.title}
          source={publicVideo.source}
        />
      ) : null}
      {lesson.blocks.map((block, index) => {
        if (block.type === "youtube")
          return (
            <YouTubeVideo
              key={`${index}/${block.videoId}`}
              videoId={block.videoId}
              title={lesson.title}
            />
          );
        if (block.type === "markdown")
          return (
            <section key={index} className={styles.notes} aria-label="Конспект">
              <SafeMarkdown>{block.markdown}</SafeMarkdown>
            </section>
          );
        return (
          <section key={index}>
            <Surface appearance="solid">
              <Stack gap="lg">
                <Inline>
                  <Badge tone="accent">
                    {block.kind === "homework"
                      ? "Домашнее задание"
                      : "Практика"}
                  </Badge>
                  <Badge>
                    {block.required
                      ? "Обязательное задание"
                      : "Для закрепления"}
                  </Badge>
                </Inline>
                <Heading level={2} size="card">
                  {block.title ?? block.activity.title}
                </Heading>
                {block.activity.instructions ? (
                  <SafeMarkdown>{block.activity.instructions}</SafeMarkdown>
                ) : null}
                {block.activity.type === "assignment.files" ? (
                  // The upload form arrives with spec WP-5 step 4.
                  <ul aria-label="Что проверим">
                    {block.activity.checkLabels.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <SafeMarkdown>{block.activity.question}</SafeMarkdown>
                    <QuizForm
                      key={`${organizationSlug}/${offeringSlug}/${lesson.slug}/${block.activity.slug}`}
                      activity={block.activity}
                      organizationSlug={organizationSlug}
                      offeringSlug={offeringSlug}
                      courseSlug={courseSlug}
                      lessonSlug={lesson.slug}
                    />
                  </>
                )}
              </Stack>
            </Surface>
          </section>
        );
      })}
    </div>
  );
}
