import { LearnerEntry } from "../../../../components/learning/learner-entry";
import Link from "next/link";
import { LearningShell } from "../../../../components/learning/learning-shell";
import { loadLearningCourse, lessonUrl } from "../../../../lib/public-learning";
import {
  Badge,
  Heading,
  Inline,
  Stack,
  Surface,
  Text,
  buttonClass
} from "@platform/ui";
import { BookOpen, Clock, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { LearningPageHeading } from "../../../../components/learning/learning-page-heading";
import { LessonOutline } from "../../../../components/learning/lesson-outline";
import styles from "../../../../components/learning/flow.module.css";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ organizationSlug: string; offeringSlug: string }>;
};
export default async function CoursePage({ params }: Props) {
  const { organizationSlug, offeringSlug } = await params;
  const course = await loadLearningCourse(organizationSlug, offeringSlug);
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
      <LearningPageHeading
        eyebrow={course.organization.name}
        title={course.course.title}
        description={course.course.description}
      >
        <Inline>
          <Badge tone="accent">Бесплатно · В своём темпе</Badge>
          <Badge>
            <BookOpen size={15} aria-hidden="true" />
            {course.course.lessons.length} уроков
          </Badge>
          <Badge>
            <Clock size={15} aria-hidden="true" />
            Около {duration} мин
          </Badge>
        </Inline>
      </LearningPageHeading>
      <div className={styles.courseLayout}>
        <section aria-labelledby="lessons-title">
          <Heading level={2} id="lessons-title">
            Программа курса
          </Heading>
          <LessonOutline course={course} />
        </section>
        <aside className={styles.aside} aria-label="Начать курс">
          <Surface>
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
          </Surface>
          <LearnerEntry
            organizationSlug={organizationSlug}
            offeringSlug={offeringSlug}
          />
        </aside>
      </div>
    </LearningShell>
  );
}
