import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  XIcon
} from "@phosphor-icons/react/dist/ssr";
import type { PublicLearningCourse } from "@platform/contracts";
import { Alert, ButtonLink, Skeleton } from "@platform/ui";
import { loadLearningCatalog, courseUrl } from "../../lib/public-learning";
import { orderByRoute } from "../../lib/learning-route";
import { CatalogRetry } from "./catalog-retry";
import { CourseCard, CoursesEmpty } from "./course-list";
import { RouteCharacters } from "../characters/route-characters";
import styles from "./home-discovery.module.css";

/** The primary action goes straight to the first real course when one exists. */
async function HeroActions() {
  let first: PublicLearningCourse | undefined;
  try {
    // The route's first published course (ПК), not the API's alphabetical first.
    first = orderByRoute((await loadLearningCatalog()).courses)[0];
  } catch {
    first = undefined;
  }
  return <HeroButtons href={first ? courseUrl(first) : "/courses"} />;
}

function HeroButtons({ href }: { href: string }) {
  return (
    <div className={styles.heroActions}>
      <ButtonLink size="lg" href={href}>
        Начать первый курс <ArrowRightIcon size={20} aria-hidden="true" />
      </ButtonLink>
      <ButtonLink size="lg" variant="secondary" href="#courses">
        Смотреть все курсы
      </ButtonLink>
    </div>
  );
}

/** Decorative product preview: what a lesson looks like, built from markup. */
function LessonPreview() {
  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.previewCard}>
        <div className={styles.previewTop}>
          <span>HTML · урок 8</span>
          <span>12 мин</span>
        </div>
        <div className={styles.previewBar}>
          <span />
        </div>
        <p className={styles.previewTitle}>Заголовки и абзацы</p>
        <pre className={styles.previewCode}>
          <code>{"<h1>Мой первый сайт</h1>\n<p>Привет! Это абзац.</p>"}</code>
        </pre>
        <p className={styles.previewQuestion}>
          Какой тег — главный заголовок страницы?
        </p>
        <div className={styles.previewOptions}>
          <span>&lt;title&gt;</span>
          <span data-correct="">
            &lt;h1&gt; <CheckIcon size={16} weight="bold" />
          </span>
          <span>&lt;p&gt;</span>
        </div>
      </div>
      <div className={`${styles.chip} ${styles.chipTop}`}>
        <span className={styles.chipIcon}>
          <CheckIcon size={14} weight="bold" />
        </span>
        Правильно · сохранено
      </div>
      <div className={`${styles.chip} ${styles.chipBottom}`}>
        <span className={styles.chipValue}>3/8</span>
        заданий курса
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-title">
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Как это устроено</p>
        <h2 id="how-title">Всё, чтобы разобраться. Ничего лишнего.</h2>
      </div>
      <div className={styles.bento}>
        <article className={`${styles.tile} ${styles.tileWide}`}>
          <div className={styles.tileVisualVideo} aria-hidden="true">
            <span className={styles.previewPlay}>&lt;/&gt;</span>
            <div className={styles.notesLines}>
              <span />
              <span />
              <span />
            </div>
          </div>
          <h3>Урок и живые примеры</h3>
          <p>
            Объяснение на 10–15 минут и примеры, которые можно менять прямо в
            браузере.
          </p>
        </article>
        <article className={styles.tile}>
          <div className={styles.tileVisualCheck} aria-hidden="true">
            <span data-ok="">
              <CheckIcon size={18} weight="bold" />
            </span>
            <span>
              <XIcon size={18} weight="bold" />
            </span>
          </div>
          <h3>Проверка сразу</h3>
          <p>Ответили — и тут же видно, верно ли. Ошиблись — попробуйте ещё.</p>
        </article>
        <article className={styles.tile}>
          <div className={styles.tileVisualProgress} aria-hidden="true">
            <span style={{ width: "62%" }} />
          </div>
          <h3>Прогресс сохраняется</h3>
          <p>Закрыли вкладку — продолжите с того же места.</p>
        </article>
        <article className={`${styles.tile} ${styles.tileAccent}`}>
          <p className={styles.bigValue} aria-hidden="true">
            0 ₽
          </p>
          <h3>Бесплатно</h3>
          <p>Без пробных периодов и привязки карты.</p>
        </article>
      </div>
    </section>
  );
}

export function DiscoveryRows({
  courses
}: {
  courses: PublicLearningCourse[];
}) {
  if (!courses.length) return <CoursesEmpty />;
  return (
    <div className={styles.courseGrid}>
      {courses.slice(0, 6).map((course, index) => (
        <CourseCard
          key={`${course.organization.slug}/${course.offering.slug}`}
          course={course}
          index={index}
          featured={index === 0}
        />
      ))}
    </div>
  );
}

export function DiscoveryLoading() {
  return (
    <div
      className={styles.courseGrid}
      aria-busy="true"
      aria-label="Загрузка курсов"
    >
      <p role="status" className={styles.srOnly}>
        Загружаем курсы…
      </p>
      {[0, 1, 2].map((key) => (
        <div key={key} className={styles.loadingCard}>
          <Skeleton className={styles.loadingCover} />
          <Skeleton />
          <Skeleton />
        </div>
      ))}
    </div>
  );
}

export async function DiscoveryCourses() {
  // Only the read is guarded: rendering errors belong to the nearest error boundary.
  let courses: Awaited<ReturnType<typeof loadLearningCatalog>>["courses"];
  try {
    courses = (await loadLearningCatalog()).courses;
  } catch {
    return (
      <Alert title="Не удалось загрузить курсы" tone="warning">
        <p>Попробуйте ещё раз чуть позже.</p>
        <CatalogRetry />
      </Alert>
    );
  }
  return <DiscoveryRows courses={courses} />;
}

export function CourseDiscovery() {
  return (
    <section
      className={styles.section}
      aria-labelledby="courses-title"
      id="courses"
    >
      <div className={styles.sectionHeadRow}>
        <div className={styles.sectionHead}>
          <p className={styles.kicker}>Маршрут</p>
          <h2 id="courses-title">Веб-разработка с нуля — шаг за шагом</h2>
        </div>
        <Link className={styles.allLink} href="/courses">
          Весь каталог <ArrowRightIcon size={18} aria-hidden="true" />
        </Link>
      </div>
      <Suspense fallback={<DiscoveryLoading />}>
        <DiscoveryCourses />
      </Suspense>
    </section>
  );
}

export function HomeContent() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <p className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            Бесплатно · можно без регистрации
          </p>
          <h1 id="home-title">
            Разберитесь в IT.{" "}
            <span className={styles.accentText}>По 15 минут в день.</span>
          </h1>
          <p className={styles.lead}>
            Маршрут «IT с нуля»: компьютер, браузер, HTML, CSS, JavaScript и SQL
            по порядку. Понятные уроки, живые примеры и задания с мгновенной
            проверкой. Аккаунт нужен, только чтобы сохранить прогресс.
          </p>
          <Suspense fallback={<HeroButtons href="/courses" />}>
            <HeroActions />
          </Suspense>
        </div>
        <LessonPreview />
      </section>
      <div className={styles.container}>
        <RouteCharacters />
        <CourseDiscovery />
        <HowItWorks />
        <section className={styles.finalCta} aria-labelledby="final-title">
          <h2 id="final-title">Первый урок — через минуту.</h2>
          <p>Начните с ПК — первый шаг маршрута. Регистрация не нужна.</p>
          <ButtonLink size="lg" href="/courses">
            Выбрать курс <ArrowRightIcon size={20} aria-hidden="true" />
          </ButtonLink>
        </section>
      </div>
    </>
  );
}
