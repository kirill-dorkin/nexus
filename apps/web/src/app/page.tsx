import Image from "next/image";
import type { Metadata } from "next";
import { brand } from "@platform/brand";
import { Suspense } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import {
  ButtonLink,
  Disclosure,
  Eyebrow,
  Heading,
  Stack,
  Text
} from "@platform/ui";
import { LearningShell } from "../components/learning/learning-shell";
import {
  HomeCatalog,
  CatalogLoading
} from "../components/learning/home-catalog";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Понятное обучение цифровым навыкам",
  description: `Открытые IT-курсы ${brand.name}: видео, понятные конспекты и практика в удобном темпе.`,
  alternates: { canonical: "/" },
  openGraph: { url: "/" }
};
export default function HomePage() {
  return (
    <LearningShell>
      <section className={styles.cover} aria-labelledby="home-title">
        <div className={styles.coverContent}>
          <Eyebrow>От первой строки кода к пониманию</Eyebrow>
          <Heading level={1} size="display" id="home-title">
            Понимать IT.
            <br />
            <span className={styles.accent}>Применять знания.</span>
          </Heading>
          <Text muted size="lg">
            Видео, понятные конспекты и задания — чтобы разбираться в
            технологиях и учиться в своём темпе.
          </Text>
          <div className={styles.actions}>
            <ButtonLink href="#courses" size="lg">
              Выбрать курс <ArrowRight size={20} aria-hidden="true" />
            </ButtonLink>
            <a className={styles.secondary} href="/blog">
              Читать блог
            </a>
          </div>
        </div>
        <div className={styles.example}>
          <Image
            className={styles.art}
            src="/images/learning-portal.webp"
            alt=""
            width={1099}
            height={1000}
            preload
            unoptimized
            sizes="(max-width: 760px) 100vw, 650px"
          />
          <figure
            className={styles.lessonExample}
            aria-labelledby="example-title"
          >
            <figcaption>
              <span>Пример конспекта</span>
              <h2 id="example-title">HTML: структура страницы</h2>
            </figcaption>
            <pre aria-label="Пример HTML-кода">
              <code>
                <span className={styles.tag}>{"<html "}</span>
                <span className={styles.attribute}>lang</span>
                {"="}
                <span className={styles.value}>{'"ru"'}</span>
                <span className={styles.tag}>{">"}</span>
                {"\n  "}
                <span className={styles.tag}>{"<body>"}</span>
                {"\n    "}
                <span className={styles.tag}>{"<h1>"}</span>
                {"Привет, мир!"}
                <span className={styles.tag}>{"</h1>"}</span>
                {"\n  "}
                <span className={styles.tag}>{"</body>"}</span>
                {"\n"}
                <span className={styles.tag}>{"</html>"}</span>
              </code>
            </pre>
            <p>Небольшой пример — понятная основа.</p>
          </figure>
        </div>
      </section>
      <section
        id="courses"
        className={styles.catalog}
        aria-labelledby="courses-title"
      >
        <div className={styles.catalogHeading}>
          <Heading id="courses-title">С чего начать</Heading>
          <Text muted>
            Открытые курсы.
            <br />В своём темпе.
          </Text>
          <a className={styles.allCourses} href="/courses">
            Все курсы <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
        <Suspense fallback={<CatalogLoading />}>
          <HomeCatalog />
        </Suspense>
      </section>
      <section
        id="how-it-works"
        className={styles.approach}
        aria-labelledby="approach-title"
      >
        <div className={styles.approachHeading}>
          <Eyebrow>Как проходит обучение</Eyebrow>
          <Heading id="approach-title">
            Смотреть. Разбираться.
            <br />
            <span className={styles.accent}>Пробовать.</span>
          </Heading>
        </div>
        <ol className={styles.steps}>
          <li>
            <span>01</span>
            <div>
              <h3>Увидеть главное</h3>
              <Text muted size="sm">
                Видео помогает познакомиться с темой и понять, с чего начать.
              </Text>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Понять, как устроено</h3>
              <Text muted size="sm">
                Читайте конспекты, разбирайте примеры и возвращайтесь к нужному
                месту.
              </Text>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Проверить себя</h3>
              <Text muted size="sm">
                Выполняйте задания, получайте обратную связь и пробуйте снова.
              </Text>
            </div>
          </li>
        </ol>
      </section>
      <section className={styles.blogCallout} aria-labelledby="blog-title">
        <div>
          <Eyebrow>Из блога {brand.name}</Eyebrow>
          <Heading id="blog-title">Компьютерная грамотность с нуля</Heading>
        </div>
        <div>
          <Text muted>
            Что изучить в первую очередь: устройство компьютера, файлы,
            браузер, документы и цифровая безопасность.
          </Text>
          <a href="/blog/kompyuternaya-gramotnost-s-nulya">
            Читать статью <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
      <section className={styles.questions} aria-labelledby="questions-title">
        <Stack gap="sm">
          <Eyebrow>Перед началом</Eyebrow>
          <Heading id="questions-title">Есть вопрос?</Heading>
          <Text muted>Несколько ответов, чтобы было проще начать.</Text>
        </Stack>
        <div>
          <Disclosure summary="Можно посмотреть курс без регистрации?">
            Да. Открытые уроки можно читать сразу. Аккаунт понадобится, чтобы
            записаться на курс, выполнять задания и сохранять прогресс.
          </Disclosure>
          <Disclosure summary="Нужно проходить курс в определённое время?">
            Открытые курсы рассчитаны на самостоятельное обучение. Выбирайте
            удобный темп и возвращайтесь к урокам, когда готовы.
          </Disclosure>
          <Disclosure summary="Что, если ответ на задание неверный?">
            Вы получите обратную связь и сможете попробовать снова. Прогресс
            учитывает успешно выполненные обязательные задания вашего курса.
          </Disclosure>
          <Disclosure summary="Можно изменить тему и цвет интерфейса?">
            Да. Кнопка «Тема и цвет» находится рядом с верхней частью страницы.
            Выберите светлую, тёмную или системную тему и свой цветовой акцент.
            Настройки сохраняются в этом браузере.
          </Disclosure>
        </div>
      </section>
    </LearningShell>
  );
}
