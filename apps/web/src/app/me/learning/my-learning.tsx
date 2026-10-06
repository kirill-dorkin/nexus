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
import styles from "../../../components/learning/learning.module.css";
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
    <section>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Возвращайтесь к практике</p>
        <h1>Моё обучение</h1>
        <p className={styles.lead}>
          Ваши курсы и сохранённые результаты обязательных заданий.
        </p>
      </header>
      {loading && <p role="status">Загружаем обучение…</p>}
      {anonymous && (
        <>
          <p>Войдите, чтобы увидеть свои курсы.</p>
          <Link
            className={styles.button}
            href={learningLoginUrl("/me/learning")}
          >
            Войти
          </Link>
        </>
      )}
      {!loading && !anonymous && !error && !courses.length && (
        <p>
          Вы пока не записаны на доступные курсы.{" "}
          <Link href="/courses">Выбрать курс</Link>
        </p>
      )}
      <div className={styles.cards}>
        {courses.map((c) => {
          const next = c.progress?.nextLessonSlug ?? c.course.lessons[0]!.slug;
          return (
            <article
              className={styles.card}
              key={`${c.organization.slug}/${c.offering.slug}`}
            >
              <p className={styles.eyebrow}>{c.organization.name}</p>
              <h2>{c.course.title}</h2>
              <CourseProgress learning={c} />
              <Link
                className={styles.button}
                href={`/learn/${c.organization.slug}/${c.offering.slug}/${next}`}
              >
                {c.progress?.allRequiredPassed
                  ? "Вернуться к материалам"
                  : "Продолжить"}
              </Link>
            </article>
          );
        })}
      </div>
      {cursor && (
        <button
          className={styles.secondaryButton}
          disabled={busy}
          onClick={() => void more()}
        >
          Показать ещё
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {!anonymous && !loading && (
        <div className={styles.actions}>
          <button
            className={styles.secondaryButton}
            disabled={busy}
            onClick={() => setReload((x) => x + 1)}
          >
            Обновить обучение
          </button>
          <button
            className={styles.secondaryButton}
            disabled={busy}
            onClick={() => void logout()}
          >
            Выйти
          </button>
        </div>
      )}
    </section>
  );
}
