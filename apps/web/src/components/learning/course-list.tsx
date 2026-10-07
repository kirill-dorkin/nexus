import type { PublicLearningCourse } from "@platform/contracts";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "@phosphor-icons/react/dist/ssr";
import { Badge, Card, EmptyState, Heading, Surface, Text } from "@platform/ui";
import { courseUrl } from "../../lib/public-learning";
import styles from "./learning.module.css";
export function CourseList({ courses }: { courses: PublicLearningCourse[] }) {
  if (courses.length === 0)
    return (
      <Surface appearance="glass" padding="none">
        <EmptyState
          title="Курсы готовятся к открытию"
          icon={<BookOpen size={32} />}
        >
          Здесь появятся доступные бесплатные курсы. Загляните чуть позже —
          впереди много интересного.
        </EmptyState>
      </Surface>
    );
  return (
    <div className={styles.cards}>
      {courses.map((course) => (
        <Card
          className={styles.card}
          key={`${course.organization.slug}/${course.offering.slug}`}
        >
          <Badge tone="accent">Бесплатно · В своём темпе</Badge>
          <Heading level={3} size="card">
            <Link href={courseUrl(course)}>{course.course.title}</Link>
          </Heading>
          <Text muted size="sm">
            {course.organization.name}
          </Text>
          <Text muted className={styles.excerpt}>
            {course.course.description}
          </Text>
          <p className={styles.muted}>
            {course.course.lessons.length} уроков ·{" "}
            {course.course.lessons.reduce(
              (sum, lesson) => sum + lesson.durationMinutes,
              0
            )}{" "}
            мин
          </p>
          <Link className={styles.textLink} href={courseUrl(course)}>
            Посмотреть курс <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </Card>
      ))}
    </div>
  );
}
