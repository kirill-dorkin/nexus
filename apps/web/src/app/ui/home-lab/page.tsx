import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Alert, ButtonLink, Skeleton } from "@platform/ui";
import { loadLearningCatalog, courseUrl } from "../../../lib/public-learning";
import { courseArtwork } from "../../../components/learning/course-artwork";
import { lessonCount } from "../../../components/learning/learning-labels";
import { CatalogRetry } from "../../../components/learning/catalog-retry";
import { HomeLab } from "./home-lab";
import styles from "./home-lab.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Новая главная — дизайн Preview",
  robots: { index: false, follow: false },
};

function CourseLoading() {
  return (
    <div
      className={styles.courseLoading}
      aria-busy="true"
      aria-label="Загрузка курсов"
    >
      <Skeleton className={styles.coverPlaceholder} />
      <div>
        <p role="status">Загружаем курсы…</p>
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  );
}

async function Courses() {
  let catalog;
  try {
    catalog = await loadLearningCatalog();
  } catch {
    return (
      <Alert title="Не удалось загрузить курсы" tone="warning">
        <p>Попробуйте обновить каталог чуть позже.</p>
        <CatalogRetry />
      </Alert>
    );
  }
  if (!catalog.courses.length)
    return (
      <div className={styles.empty}>
        <h3>Курсы готовятся к открытию</h3>
        <p>Здесь появятся доступные материалы. Загляните чуть позже.</p>
      </div>
    );
  return (
    <div className={styles.courseList}>
      {catalog.courses.slice(0, 3).map((course) => {
        const artwork = courseArtwork(
          course.organization.slug,
          course.offering.slug,
        );
        const description = course.course.description.split(/(?<=[.!?])\s+/)[0];
        const minutes = course.course.lessons.reduce(
          (sum, lesson) => sum + lesson.durationMinutes,
          0,
        );
        return (
          <article
            className={`${styles.course} ${!artwork ? styles.courseWithoutArt : ""}`}
            key={`${course.organization.slug}/${course.offering.slug}`}
          >
            {artwork && (
              <Link
                href={courseUrl(course)}
                className={styles.courseImage}
                tabIndex={-1}
                aria-hidden="true"
              >
                <Image
                  {...artwork}
                  alt=""
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 520px"
                />
              </Link>
            )}
            <div className={styles.courseCopy}>
              <h2>
                <Link href={courseUrl(course)}>{course.course.title}</Link>
              </h2>
              {description && (
                <p className={styles.courseDescription}>{description}</p>
              )}
              <p className={styles.courseMeta}>
                <span>{lessonCount(course.course.lessons.length)}</span>
                <span>{minutes} мин</span>
              </p>
              <ButtonLink href={courseUrl(course)}>
                Открыть курс <ArrowRight size={18} aria-hidden="true" />
              </ButtonLink>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function HomeLabPage() {
  return (
    <HomeLab>
      <section
        id="courses"
        className={styles.courses}
        aria-label="Доступные курсы"
      >
        <Suspense fallback={<CourseLoading />}>
          <Courses />
        </Suspense>
        <Link className={styles.catalogLink} href="/courses">
          Все курсы <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </HomeLab>
  );
}
