"use client";
import {
  ownLearningListSchema,
  type LearnerLearningCourse
} from "@platform/contracts";
import { useEffect, useState } from "react";
import Link from "next/link";
import { browserApiRequest } from "../../../lib/public-api";
import { learningLoginUrl } from "../../../lib/learning-return-to";
import { CourseProgress } from "../../../components/learning/course-progress";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Grid,
  Heading,
  Inline,
  Surface,
  buttonClass
} from "@platform/ui";
import { BookOpen, ArrowRight } from "@phosphor-icons/react/dist/ssr";
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
            icon={<BookOpen size={32} />}
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
            icon={<BookOpen size={32} />}
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
        <Grid className={styles.savedGrid}>
          {courses.map((c) => {
            const next =
              c.progress?.nextLessonSlug ?? c.course.lessons[0]!.slug;
            return (
              <Card
                className={styles.savedCard}
                key={`${c.organization.slug}/${c.offering.slug}`}
              >
                <Inline>
                  <Badge tone="accent">Бесплатно</Badge>
                  {c.entry.enrollmentStatus === "completed" && (
                    <Badge tone="success">Обучение завершено</Badge>
                  )}
                </Inline>
                <Eyebrow>{c.organization.name}</Eyebrow>
                <Heading level={2} size="card">
                  <Link
                    href={`/learn/${c.organization.slug}/${c.offering.slug}`}
                  >
                    {c.course.title}
                  </Link>
                </Heading>
                <CourseProgress learning={c} />
                <Link
                  className={buttonClass()}
                  href={`/learn/${c.organization.slug}/${c.offering.slug}/${next}`}
                >
                  {c.progress?.allRequiredPassed
                    ? "Вернуться к материалам"
                    : "Продолжить"}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </Card>
            );
          })}
        </Grid>
      )}
      {cursor && (
        <Button variant="secondary" loading={busy} onClick={() => void more()}>
          Показать ещё
        </Button>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      {!anonymous && !loading && (
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
