import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ArrowRight, BookOpen, Clock } from "@phosphor-icons/react/dist/ssr";
import { brand } from "@platform/brand";
import type { PublicLearningCourse } from "@platform/contracts";
import { Alert, ButtonLink, Skeleton } from "@platform/ui";
import { loadLearningCatalog, courseUrl } from "../../lib/public-learning";
import { AppearanceControl } from "../appearance/appearance-control";
import { LearningNavigation } from "./learning-navigation";
import { CatalogRetry } from "./catalog-retry";
import { courseArtwork } from "./course-artwork";
import { lessonCount } from "./learning-labels";
import brandStyles from "./learning.module.css";
import styles from "./home-discovery.module.css";

export function HomeDiscoveryShell({
  children,
  preview = false,
  layout = "open",
}: {
  children: ReactNode;
  preview?: boolean;
  layout?: "open" | "editorial";
}) {
  return (
    <div
      className={styles.page}
      data-home-preview={preview || undefined}
      data-home-layout={layout}
    >
      <a className={styles.skip} href="#home-content">
        Перейти к содержимому
      </a>
      <header className={styles.header}>
        <Link
          href="/"
          className={brandStyles.brand}
          aria-label={`${brand.name} — на главную`}
        >
          <span className={brandStyles.brandMark} aria-hidden="true">
            N
          </span>
          <span className={brandStyles.brandLockup}>
            <span>{brand.name}</span>
            <small>учебная среда</small>
          </span>
        </Link>
        <LearningNavigation />
      </header>
      <aside
        className={styles.appearanceDock}
        aria-label="Оформление интерфейса"
      >
        <AppearanceControl
          showAccentLabels
          dialogClassName={styles.appearanceDialog ?? ""}
        />
      </aside>
      {preview && (
        <nav className={styles.previewNotice} aria-label="Варианты дизайна">
          <span>Дизайн Preview</span>
          <div>
            <Link
              href="/ui/home-lab"
              aria-current={layout === "open" ? "page" : undefined}
            >
              Открытый выбор
            </Link>
            <Link
              href="/ui/home-lab?layout=editorial"
              aria-current={layout === "editorial" ? "page" : undefined}
            >
              Редакционный
            </Link>
          </div>
        </nav>
      )}
      <main id="home-content" tabIndex={-1}>
        <section className={styles.introduction} aria-labelledby="home-title">
          <p className={styles.eyebrow}>Образовательная платформа</p>
          <h1 id="home-title">Новые навыки — в вашем темпе.</h1>
          <p className={styles.introText}>
            Понятные конспекты и практика. Выберите курс и начните разбираться.
          </p>
        </section>
        {children}
      </main>
      <footer className={styles.footer}>
        <span>
          {brand.name}
          <span className={styles.footerCaption}>Учебная среда</span>
        </span>
        <nav aria-label="Меню внизу страницы">
          <Link href="/courses">Курсы</Link>
          <Link href="/blog">Блог</Link>
          <Link href="/studio">Для авторов</Link>
        </nav>
      </footer>
    </div>
  );
}

export function DiscoveryRows({
  courses,
}: {
  courses: PublicLearningCourse[];
}) {
  if (!courses.length)
    return (
      <div className={styles.empty}>
        <h3>Курсы готовятся к открытию</h3>
        <p>
          Здесь появятся доступные материалы. Пока можно почитать{" "}
          <Link href="/blog">блог</Link>.
        </p>
      </div>
    );
  return (
    <div className={styles.courseList}>
      {courses.slice(0, 3).map((course, index) => {
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
            className={`${styles.course} ${!artwork ? styles.withoutArt : ""}`}
            key={`${course.organization.slug}/${course.offering.slug}`}
          >
            <div className={styles.courseCopy}>
              <p className={styles.courseLabel}>Курс</p>
              <h3>
                <Link href={courseUrl(course)}>{course.course.title}</Link>
              </h3>
              {description && (
                <p className={styles.courseDescription}>{description}</p>
              )}
              <ul className={styles.courseMeta} aria-label="Сведения о курсе">
                <li>
                  <BookOpen size={18} aria-hidden="true" />
                  {lessonCount(course.course.lessons.length)}
                </li>
                {minutes > 0 && (
                  <li>
                    <Clock size={18} aria-hidden="true" />
                    {minutes} мин
                  </li>
                )}
              </ul>
              <ButtonLink
                className={styles.courseAction}
                href={courseUrl(course)}
              >
                Посмотреть программу <ArrowRight size={20} aria-hidden="true" />
              </ButtonLink>
            </div>
            {artwork && (
              <div className={styles.courseVisual}>
                <div className={styles.courseImage}>
                  <Image
                    {...artwork}
                    alt=""
                    unoptimized
                    preload={index === 0}
                    sizes="(max-width: 700px) 100vw, 530px"
                  />
                </div>
                {course.course.lessons.length > 0 && (
                  <div className={styles.syllabus}>
                    <p>В программе</p>
                    <ul>
                      {course.course.lessons.slice(0, 3).map((lesson) => (
                        <li key={lesson.slug}>{lesson.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function DiscoveryLoading() {
  return (
    <div
      className={styles.courseLoading}
      aria-busy="true"
      aria-label="Загрузка курсов"
    >
      <div>
        <p role="status">Загружаем курсы…</p>
        <Skeleton />
        <Skeleton />
        <Skeleton className={styles.actionPlaceholder} />
      </div>
      <Skeleton className={styles.coverPlaceholder} />
    </div>
  );
}

export async function DiscoveryCourses() {
  try {
    const catalog = await loadLearningCatalog();
    return <DiscoveryRows courses={catalog.courses} />;
  } catch {
    return (
      <Alert title="Не удалось загрузить курсы" tone="warning">
        <p>Попробуйте ещё раз чуть позже.</p>
        <CatalogRetry />
      </Alert>
    );
  }
}

export function CourseDiscovery() {
  return (
    <section
      className={styles.discovery}
      aria-labelledby="courses-title"
      id="courses"
    >
      <div className={styles.discoveryHeading}>
        <h2 id="courses-title">Что будете изучать?</h2>
        <Link href="/courses">
          Все курсы <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <Suspense fallback={<DiscoveryLoading />}>
        <DiscoveryCourses />
      </Suspense>
    </section>
  );
}
