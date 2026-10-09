import { LearnerEntry } from "../../../../components/learning/learner-entry";
import Link from "next/link";
import Image from "next/image";
import { courseArtwork } from "../../../../components/learning/course-artwork";
import { LearningShell } from "../../../../components/learning/learning-shell";
import { loadLearningCourse, lessonUrl } from "../../../../lib/public-learning";
import {
  Badge,
  Heading,
  Inline,
  Stack,
  Text,
  buttonClass
} from "@platform/ui";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { LearningPageHeading } from "../../../../components/learning/learning-page-heading";
import { LessonOutline } from "../../../../components/learning/lesson-outline";
import { lessonCount } from "../../../../components/learning/learning-labels";
import styles from "../../../../components/learning/flow.module.css";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ organizationSlug: string; offeringSlug: string }>;
};
export default async function CoursePage({ params }: Props) {
  const { organizationSlug, offeringSlug } = await params;
  const course = await loadLearningCourse(organizationSlug, offeringSlug);
  const artwork = courseArtwork(organizationSlug, offeringSlug);
  const duration = course.course.lessons.reduce(
    (sum, lesson) => sum + lesson.durationMinutes,
    0
  );
  return (
    <LearningShell>
      <nav className={styles.breadcrumbs} aria-label="Навигационная цепочка">
        <Link href="/courses">Все курсы</Link>
        <span aria-current="page">{course.course.title}</span>
      </nav>
      <div className={artwork ? styles.courseHero : undefined}>
      <LearningPageHeading
        eyebrow={course.organization.name}
        title={course.course.title}
        description={course.course.description}
      >
        <Inline>
          <Badge tone="accent">Бесплатно · В своём темпе</Badge>
          <Text muted size="sm">
            {lessonCount(course.course.lessons.length)}
          </Text>
          <Text muted size="sm">
            Около {duration} мин
          </Text>
        </Inline>
      </LearningPageHeading>
      {artwork ? <Image className={styles.courseCover} {...artwork} unoptimized sizes="(max-width: 960px) 100vw, 45vw" /> : null}
      </div>
      <div className={styles.courseLayout}>
        <section aria-labelledby="lessons-title">
          <header className={styles.outlineHeading}>
            <Heading level={2} id="lessons-title">
              Программа курса
            </Heading>
            <Text muted size="sm">
              {lessonCount(course.course.lessons.length)} · около {duration} мин
            </Text>
          </header>
          <LessonOutline course={course} />
        </section>
        <aside className={styles.aside} aria-label="Начать курс">
          <section className={styles.courseStart}>
            <Stack gap="lg">
              <Heading level={2} size="card">
                В удобном ритме
              </Heading>
              <Text muted size="sm">
                Смотрите видео, читайте конспекты и возвращайтесь к нужным
                темам.
              </Text>
              <Link
                className={buttonClass()}
                href={lessonUrl(course, course.course.lessons[0]!.slug)}
              >
                Открыть первый урок <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </Stack>
          </section>
          <LearnerEntry
            organizationSlug={organizationSlug}
            offeringSlug={offeringSlug}
          />
        </aside>
      </div>
    </LearningShell>
  );
}
