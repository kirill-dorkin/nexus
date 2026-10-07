import Image from "next/image";
import { Suspense } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Play,
  ArrowUpRight
} from "@phosphor-icons/react/dist/ssr";
import {
  Badge,
  ButtonLink,
  Card,
  Disclosure,
  Eyebrow,
  Heading,
  Inline,
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
export default function HomePage() {
  return (
    <LearningShell>
      <section className={styles.cover} aria-labelledby="home-title">
        <Image
          className={styles.art}
          src="/images/learning-ribbon.webp"
          alt=""
          fill
          preload
          sizes="(max-width: 760px) 100vw, 900px"
        />
        <div className={styles.coverContent}>
          <Badge tone="accent">Здесь начинается ваше развитие</Badge>
          <Heading level={1} size="display" id="home-title">
            От интереса
            <br />к настоящим
            <br />
            <span className={styles.accent}>навыкам.</span>
          </Heading>
          <Text muted size="lg">
            Разбирайтесь в новом, пробуйте на практике и двигайтесь в своём
            темпе. Видео, конспекты и задания — всё в одном месте.
          </Text>
          <Inline gap="sm" className={styles.actions}>
            <ButtonLink href="#courses" size="lg">
              Выбрать курс <ArrowRight size={18} aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/me/learning" variant="secondary" size="lg">
              Моё обучение
            </ButtonLink>
          </Inline>
          <Text muted size="sm">
            Бесплатное начало. Пространство для вашего темпа.
          </Text>
        </div>
        <div className={styles.artCaption} aria-hidden="true">
          <span>Любопытство — начало.</span>
          <strong>Практика — продолжение.</strong>
        </div>
        <div className={styles.coverFoot}>
          <span>
            <Play size={16} aria-hidden="true" /> Смотрите
          </span>
          <span>
            <BookOpen size={16} aria-hidden="true" /> Разбирайтесь
          </span>
          <span>
            <CheckCircle size={16} aria-hidden="true" /> Пробуйте
          </span>
          <span className={styles.coverFootNote}>
            Обучение, которое остаётся с вами
          </span>
        </div>
      </section>
      <section
        id="courses"
        className={styles.section}
        aria-labelledby="courses-title"
      >
        <div className={styles.sectionHeading}>
          <Stack gap="sm">
            <Eyebrow>Первый шаг — ваше любопытство</Eyebrow>
            <Heading id="courses-title">Выберите, с чего начать</Heading>
            <Text muted>
              Бесплатные курсы. Учитесь без спешки, возвращайтесь когда удобно.
            </Text>
          </Stack>
          <ButtonLink href="/courses" variant="ghost">
            Все курсы <ArrowUpRight size={18} aria-hidden="true" />
          </ButtonLink>
        </div>
        <Suspense fallback={<CatalogLoading />}>
          <HomeCatalog />
        </Suspense>
      </section>
      <section
        id="how-it-works"
        className={styles.section}
        aria-labelledby="approach-title"
      >
        <div className={styles.sectionHeading}>
          <Stack gap="sm">
            <Eyebrow>Понятный путь</Eyebrow>
            <Heading id="approach-title">
              Меньше барьеров.
              <br />
              Больше понимания.
            </Heading>
          </Stack>
          <Text muted className={styles.sectionDescription}>
            Не просто пройти материал — понять его и проверить себя. Один урок,
            один следующий шаг.
          </Text>
        </div>
        <div className={styles.approach}>
          {[
            {
              number: "01",
              Icon: Play,
              title: "Погрузитесь в тему",
              copy: "Короткие видео помогают увидеть главное. Начните с того, что вызывает интерес."
            },
            {
              number: "02",
              Icon: BookOpen,
              title: "Разложите по полочкам",
              copy: "Понятные конспекты остаются под рукой. Возвращайтесь к материалу, когда нужно."
            },
            {
              number: "03",
              Icon: CheckCircle,
              title: "Проверьте понимание",
              copy: "Задания с обратной связью помогают закрепить знания. Можно попробовать ещё раз."
            }
          ].map(({ number, Icon, title, copy }) => (
            <Card
              key={number}
              appearance="quiet"
              className={styles.approachCard}
            >
              <Inline className={styles.stepTop}>
                <Icon size={25} aria-hidden="true" />
                <span>{number}</span>
              </Inline>
              <Heading level={3} size="card">
                {title}
              </Heading>
              <Text muted size="sm">
                {copy}
              </Text>
            </Card>
          ))}
        </div>
      </section>
      <section className={styles.questions} aria-labelledby="questions-title">
        <Stack gap="sm">
          <Eyebrow>Перед началом</Eyebrow>
          <Heading id="questions-title">Всё просто.</Heading>
        </Stack>
        <div>
          <Disclosure summary="Можно сначала посмотреть курс без регистрации?">
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
        </div>
      </section>
    </LearningShell>
  );
}
