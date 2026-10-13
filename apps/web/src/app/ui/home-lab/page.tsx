import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Alert, ButtonLink, Disclosure, Skeleton } from "@platform/ui";
import { loadLearningCatalog, courseUrl } from "../../../lib/public-learning";
import { blogArticles } from "../../../lib/blog";
import { courseArtwork } from "../../../components/learning/course-artwork";
import { lessonCount } from "../../../components/learning/learning-labels";
import { CatalogRetry } from "../../../components/learning/catalog-retry";
import { HomeLab } from "./home-lab";
import styles from "./home-lab.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Новая главная — дизайн Preview",
  robots: { index: false, follow: false }
};

function CourseLoading() {
  return <div className={styles.courseLoading} aria-busy="true" aria-label="Загрузка курсов">
    <Skeleton className={styles.coverPlaceholder} />
    <div><p role="status">Загружаем курсы…</p><Skeleton /><Skeleton /></div>
  </div>;
}

async function Courses() {
  let catalog;
  try { catalog = await loadLearningCatalog(); }
  catch { return <Alert title="Не удалось загрузить курсы" tone="warning">
    <p>Попробуйте обновить каталог чуть позже.</p><CatalogRetry />
  </Alert>; }
  if (!catalog.courses.length) return <div className={styles.empty}>
    <h3>Курсы готовятся к открытию</h3><p>Здесь появятся доступные материалы. Загляните чуть позже.</p>
  </div>;
  return <div className={styles.courseList}>{catalog.courses.slice(0, 3).map(course => {
    const artwork = courseArtwork(course.organization.slug, course.offering.slug);
    const description = course.course.description.split(/(?<=[.!?])\s+/)[0];
    const minutes = course.course.lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0);
    return <article className={`${styles.course} ${!artwork ? styles.courseWithoutArt : ""}`} key={`${course.organization.slug}/${course.offering.slug}`}>
      {artwork && <Link href={courseUrl(course)} className={styles.courseImage} tabIndex={-1} aria-hidden="true">
        <Image {...artwork} alt="" unoptimized sizes="(max-width: 640px) 100vw, 520px" />
      </Link>}
      <div className={styles.courseCopy}>
        <p className={styles.courseOrganization}>{course.organization.name}</p>
        <h3><Link href={courseUrl(course)}>{course.course.title}</Link></h3>
        {description && <p className={styles.courseDescription}>{description}</p>}
        <p className={styles.courseMeta}><span>{lessonCount(course.course.lessons.length)}</span><span>{minutes} мин</span><span>Открытые материалы</span></p>
        <ButtonLink variant="secondary" href={courseUrl(course)}>Посмотреть программу <ArrowRight size={18} aria-hidden="true" /></ButtonLink>
      </div>
    </article>;
  })}</div>;
}

export default function HomeLabPage() {
  const article = blogArticles[0];
  return <HomeLab>
    <section id="courses" className={styles.courses} aria-labelledby="courses-title">
      <div className={styles.sectionHeading}><div><h2 id="courses-title">Начните с того, что интересно.</h2><p>Выберите курс и познакомьтесь с первым уроком.</p></div>
        <Link className={styles.textLink} href="/courses">Весь каталог <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
      <Suspense fallback={<CourseLoading />}><Courses /></Suspense>
    </section>
    {article && <section className={styles.blog} aria-labelledby="blog-title">
      <div className={styles.blogIntro}><h2 id="blog-title">Полезное<br /> между уроками.</h2><Link className={styles.textLink} href="/blog">Блог платформы <ArrowRight size={18} aria-hidden="true" /></Link></div>
      <article className={styles.blogArticle}><p className={styles.articleMeta}>{article.category}<span>{article.readingMinutes} мин чтения</span></p>
        <h3><Link href={`/blog/${article.slug}`}>{article.title}</Link></h3><p>{article.description}</p>
        <Link className={styles.textLink} href={`/blog/${article.slug}`}>Читать статью <ArrowRight size={18} aria-hidden="true" /></Link>
      </article>
    </section>}
    <section className={styles.questions} aria-labelledby="questions-title">
      <h2 id="questions-title">Перед первым уроком.</h2>
      <div>
        <Disclosure summary="Можно начать без регистрации?">Да. Открытые уроки можно читать сразу. Аккаунт понадобится для записи на курс, выполнения заданий и сохранения прогресса.</Disclosure>
        <Disclosure summary="Есть расписание или дедлайны?">Открытые курсы рассчитаны на самостоятельное обучение. Проходите уроки в удобном темпе и возвращайтесь к сложным темам.</Disclosure>
        <Disclosure summary="Что, если ответ неверный?">Вы получите объяснение и сможете попробовать снова. Прогресс учитывает успешно выполненные обязательные задания курса.</Disclosure>
      </div>
    </section>
  </HomeLab>;
}
