"use client";
import {
  ownLearningListSchema,
  type LearnerLearningCourse
} from "@platform/contracts";
import { useEffect, useState } from "react";
import Link from "next/link";
import { browserApiRequest } from "../../../lib/public-api";
import { learningLoginUrl } from "../../../lib/learning-return-to";
import { courseUrl, lessonUrl } from "../../../lib/public-learning-routes";
import { CourseProgress } from "../../../components/learning/course-progress";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Eyebrow,
  Inline,
  Surface,
  Text,
  buttonClass
} from "@platform/ui";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { LearningPageHeading } from "../../../components/learning/learning-page-heading";
import { LearningLoading } from "../../../components/learning/learning-loading";
import styles from "../../../components/learning/flow.module.css";
export function MyLearning() {
  const [courses, setCourses] = useState<LearnerLearningCourse[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [anonymous, setAnonymous] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [reload, setReload] = useState(0);
  const completedCount = courses.filter(
    (course) => course.entry.enrollmentStatus === "completed"
  ).length;
  const inProgressCount = courses.length - completedCount;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setAnonymous(false);
    setError(null);
    setCourses([]);
    setCursor(null);
    void (async () => {
      try {
        const r = await browserApiRequest("/v1/me/learning", {
          signal: controller.signal
        });
        if (r.status === 401) {
          setAnonymous(true);
          return;
        }
        if (!r.ok) throw new Error("Unavailable");
        const data = ownLearningListSchema.parse(await r.json());
        setCourses(data.courses);
        setCursor(data.nextCursor);
      } catch {
        if (!controller.signal.aborted)
          setError("Не удалось загрузить обучение.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [reload]);
  async function more() {
    if (!cursor) return;
    setBusy(true);
    setError(null);
    try {
      const r = await browserApiRequest(
        `/v1/me/learning?after=${encodeURIComponent(cursor)}`
      );
      if (r.status === 401) {
        setAnonymous(true);
        setCourses([]);
        setCursor(null);
        return;
      }
      if (!r.ok) throw new Error("Unavailable");
      const data = ownLearningListSchema.parse(await r.json());
      setCourses((old) => [
        ...new Map(
          [...old, ...data.courses].map((c) => [
            `${c.organization.slug}/${c.offering.slug}`,
            c
          ])
        ).values()
      ]);
      setCursor(data.nextCursor);
    } catch {
      setError("Не удалось загрузить следующую страницу. Попробуйте снова.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError(null);
    try {
      const r = await browserApiRequest("/v1/auth/logout", { method: "POST" });
      if (!r.ok) throw new Error("Unavailable");
      setCourses([]);
      setCursor(null);
      setAnonymous(true);
    } catch {
      setError("Не удалось выйти. Попробуйте снова.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-busy={loading || busy}>
      <LearningPageHeading
        eyebrow="Возвращайтесь к практике"
        title="Моё обучение"
        description="Ваши курсы и сохранённые результаты обязательных заданий."
      />
      {loading && (
        <Surface>
          <LearningLoading>Загружаем обучение…</LearningLoading>
        </Surface>
      )}
      {anonymous && (
        <Surface padding="none">
          <EmptyState
            title="Ваше обучение начинается здесь"
            action={
              <Link
                className={buttonClass()}
                href={learningLoginUrl("/me/learning")}
              >
                Войти
              </Link>
            }
          >
            Войдите, чтобы увидеть свои курсы.
          </EmptyState>
        </Surface>
      )}
      {!loading && !anonymous && !error && !courses.length && (
        <Surface padding="none">
          <EmptyState
            title="Вы пока не записаны на доступные курсы."
            action={
              <Link className={buttonClass()} href="/courses">
                Выбрать курс <ArrowRight size={18} aria-hidden="true" />
              </Link>
            }
          >
            Выберите бесплатный курс и запишитесь, чтобы сохранять результаты
            практики.
          </EmptyState>
        </Surface>
      )}
      {courses.length > 0 && (
        <div className={styles.learningSummary} aria-label="Сводка обучения">
          <span>Сводка</span>
          <p>
            <strong>{inProgressCount}</strong>
            <small>в процессе</small>
          </p>
          <p>
            <strong>{completedCount}</strong>
            <small>завершено</small>
          </p>
        </div>
      )}
      {courses.length > 0 && (
        <ul className={styles.savedList}>
          {courses.map((c) => {
            const next =
              c.progress?.nextLessonSlug ?? c.course.lessons[0]!.slug;
            return (
              <li
                className={styles.savedCard}
                key={`${c.organization.slug}/${c.offering.slug}`}
              >
                <div className={styles.savedDetails}>
                  <Inline>
                    <Badge tone="accent">Бесплатно</Badge>
                    {c.entry.enrollmentStatus === "completed" && (
                      <Badge tone="success">Обучение завершено</Badge>
                    )}
                  </Inline>
                  <Eyebrow>{c.organization.name}</Eyebrow>
                  <h2>
                    <Link
                      href={courseUrl(c)}
                    >
                      {c.course.title}
                    </Link>
                  </h2>
                  <Text muted size="sm">
                    {c.course.description}
                  </Text>
                </div>
                <div className={styles.savedProgress}>
                  <CourseProgress learning={c} />
                  <Link
                    className={buttonClass()}
                    href={lessonUrl(c, next)}
                  >
                    {c.progress?.allRequiredPassed
                      ? "Вернуться к материалам"
                      : "Продолжить"}
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {cursor && (
        <Button variant="secondary" loading={busy} onClick={() => void more()}>
          Показать ещё
        </Button>
      )}
      {error && (
        <Surface className={styles.learningError} appearance="quiet">
          <Alert tone="danger" title="Обучение сейчас недоступно">
            {error}
          </Alert>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setReload((x) => x + 1)}
          >
            Повторить загрузку
          </Button>
        </Surface>
      )}
      {!anonymous && !loading && !error && (
        <Inline gap="sm" className={styles.savedGrid}>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setReload((x) => x + 1)}
          >
            Обновить обучение
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => void logout()}>
            Выйти
          </Button>
        </Inline>
      )}
    </section>
  );
}
