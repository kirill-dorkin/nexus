"use client";
import {
  learnerLearningCourseSchema,
  type LearnerLearningCourse
} from "@platform/contracts";
import { useEffect, useState } from "react";
import Link from "next/link";
import { browserApiRequest } from "../../lib/public-api";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { CourseProgress } from "./course-progress";
import styles from "./learning.module.css";
export function LearnerEntry({
  organizationSlug,
  offeringSlug,
  lessonSlug
}: {
  organizationSlug: string;
  offeringSlug: string;
  lessonSlug?: string;
}) {
  const route = `/learn/${organizationSlug}/${offeringSlug}${lessonSlug ? `/${lessonSlug}` : ""}`;
  const api = `/v1/me/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}`;
  const [learning, setLearning] = useState<LearnerLearningCourse | null>(null),
    [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null),
    [reload, setReload] = useState(0),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLearning(null);
    setAnonymous(false);
    setError(null);
    void (async () => {
      try {
        const r = await browserApiRequest(api, { signal: controller.signal });
        if (r.status === 401) {
          setAnonymous(true);
          return;
        }
        if (!r.ok) throw new Error("Learning unavailable");
        setLearning(learnerLearningCourseSchema.parse(await r.json()));
      } catch {
        if (!controller.signal.aborted)
          setError(
            "Не удалось загрузить состояние обучения. Попробуйте снова."
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [api, reload]);
  async function action(kind: "join" | "enroll") {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await browserApiRequest(
        kind === "join"
          ? `/v1/public/organizations/${encodeURIComponent(organizationSlug)}/memberships/me`
          : `${api}/enrollment`,
        { method: "POST", body: "{}" }
      );
      if (response.status === 401) {
        setLearning(null);
        setAnonymous(true);
        return;
      }
      if (!response.ok) {
        setError(
          response.status === 409 ||
            response.status === 403 ||
            response.status === 404
            ? "Доступ изменился. Обновите состояние обучения или обратитесь в организацию."
            : "Не удалось выполнить действие. Можно безопасно повторить его."
        );
        return;
      }
      if (kind === "enroll") {
        setLearning(learnerLearningCourseSchema.parse(await response.json()));
        setMessage(
          "Вы записаны на курс. Результаты практики будут сохраняться."
        );
      } else {
        setMessage(
          "Вы вступили в организацию. Теперь можно записаться на курс."
        );
        setReload((x) => x + 1);
      }
    } catch {
      setError(
        "Не удалось связаться с сервером. Можно безопасно повторить действие."
      );
    } finally {
      setBusy(false);
    }
  }
  const enrolled =
    learning?.progress !== null && learning?.progress !== undefined;
  const next =
    learning?.progress?.nextLessonSlug ?? learning?.course.lessons[0]?.slug;
  return (
    <section
      className={styles.entry}
      aria-label="Сохранённое обучение"
      aria-busy={busy || loading}
    >
      <h2>Ваше обучение</h2>
      {loading && <p role="status">Проверяем состояние обучения…</p>}
      {anonymous && (
        <>
          <p>
            Войдите или зарегистрируйтесь, чтобы записаться на курс и сохранять
            результаты практики.
          </p>
          <Link className={styles.button} href={learningLoginUrl(route)}>
            Войти и сохранить обучение
          </Link>
        </>
      )}
      {learning && (
        <>
          {enrolled ? (
            <>
              <CourseProgress learning={learning} />
              {lessonSlug && (
                <p className={styles.muted}>
                  {learning.progress?.lessons.find((l) => l.slug === lessonSlug)
                    ?.requiredPassed
                    ? "Обязательные задания этого урока выполнены."
                    : "Просмотр видео и чтение сами по себе не закрывают обязательные задания."}
                </p>
              )}
              {!lessonSlug && next && (
                <Link
                  className={styles.button}
                  href={`/learn/${organizationSlug}/${offeringSlug}/${next}`}
                >
                  {learning.progress?.allRequiredPassed
                    ? "Вернуться к материалам"
                    : "Продолжить обучение"}
                </Link>
              )}
              <Link href="/me/learning">Моё обучение</Link>
            </>
          ) : learning.entry.membershipStatus === "none" ? (
            <>
              <p>
                Для сохранения результатов сначала вступите в организацию «
                {learning.organization.name}», затем отдельно запишитесь на
                курс.
              </p>
              {learning.entry.customerEntryPolicy === "open" ? (
                <button
                  className={styles.button}
                  disabled={busy}
                  onClick={() => void action("join")}
                >
                  Вступить в организацию
                </button>
              ) : (
                <p>
                  Самостоятельное вступление закрыто. Обратитесь в организацию
                  за приглашением.
                </p>
              )}
            </>
          ) : learning.entry.membershipStatus !== "active" ? (
            <p>
              Членство сейчас неактивно. Для доступа обратитесь в организацию.
            </p>
          ) : learning.entry.enrollmentStatus === "withdrawn" ||
            learning.entry.enrollmentStatus === "cancelled" ? (
            <p>
              Эта запись на курс закрыта. Для повторного обучения обратитесь в
              организацию.
            </p>
          ) : (
            <>
              <p>
                Вы состоите в организации. Запишитесь на бесплатный курс, чтобы
                сохранять результаты практики.
              </p>
              <button
                className={styles.button}
                disabled={busy}
                onClick={() => void action("enroll")}
              >
                Записаться на бесплатный курс
              </button>
            </>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <>
          <p role="alert">{error}</p>
          <button
            className={styles.secondaryButton}
            disabled={busy}
            onClick={() => setReload((x) => x + 1)}
          >
            Обновить состояние
          </button>
        </>
      )}
    </section>
  );
}
