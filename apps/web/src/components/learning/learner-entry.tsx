"use client";
import {
  learnerLearningCourseSchema,
  type LearnerLearningCourse
} from "@platform/contracts";
import { useEffect, useState } from "react";
import Link from "next/link";
import { browserApiRequest } from "../../lib/public-api";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { courseUrl, lessonUrl } from "../../lib/public-learning-routes";
import { CourseProgress } from "./course-progress";
import {
  Alert,
  Button,
  Heading,
  Stack,
  Surface,
  Text,
  buttonClass
} from "@platform/ui";
import { LearningLoading } from "./learning-loading";
import styles from "./flow.module.css";
export function LearnerEntry({
  organizationSlug,
  offeringSlug,
  courseSlug,
  lessonSlug
}: {
  organizationSlug: string;
  offeringSlug: string;
  courseSlug: string;
  lessonSlug?: string;
}) {
  const address = {
    organization: { slug: organizationSlug },
    offering: { slug: offeringSlug },
    course: { slug: courseSlug }
  };
  const route = lessonSlug
    ? lessonUrl(address, lessonSlug)
    : courseUrl(address);
  const api = `/v1/me/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}`;
  const [learning, setLearning] = useState<LearnerLearningCourse | null>(null),
    [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null),
    [reload, setReload] = useState(0),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const refresh = () => setReload((x) => x + 1);
    window.addEventListener("learning-progress-changed", refresh);
    return () =>
      window.removeEventListener("learning-progress-changed", refresh);
  }, []);
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
  /** Sends one existing domain command; null means the caller must stop. */
  async function post(kind: "join" | "enroll"): Promise<Response | null> {
    const response = await browserApiRequest(
      kind === "join"
        ? `/v1/public/organizations/${encodeURIComponent(organizationSlug)}/memberships/me`
        : `${api}/enrollment`,
      { method: "POST", body: "{}" }
    );
    if (response.status === 401) {
      setLearning(null);
      setAnonymous(true);
      return null;
    }
    if (!response.ok) {
      setError(
        response.status === 409 ||
          response.status === 403 ||
          response.status === 404
          ? "Доступ изменился. Обновите состояние обучения или обратитесь в организацию."
          : "Не удалось выполнить действие. Можно безопасно повторить его."
      );
      return null;
    }
    return response;
  }
  async function enroll() {
    const response = await post("enroll");
    if (!response) return false;
    setLearning(learnerLearningCourseSchema.parse(await response.json()));
    setMessage("Вы записаны на курс. Результаты практики будут сохраняться.");
    return true;
  }
  /**
   * One learner gesture, two separate domain commands: explicit Organization
   * entry first, then free self-enrollment. Each keeps its own transaction,
   * idempotency and event; a failed second step leaves a visible retry.
   */
  async function action(kind: "start" | "enroll") {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (kind === "start") {
        const joined = await post("join");
        if (!joined) return;
        if (!(await enroll())) setReload((x) => x + 1);
        return;
      }
      await enroll();
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
      <Surface appearance="quiet" className={styles.entrySurface}>
        <Stack gap="lg">
          <Heading level={2} size="card">
            Ваше обучение
          </Heading>
          {loading && (
            <LearningLoading>Проверяем состояние обучения…</LearningLoading>
          )}
          {anonymous && (
            <>
              <p>
                Войдите или зарегистрируйтесь, чтобы записаться на курс и
                сохранять результаты практики.
              </p>
              <Link
                className={buttonClass({ variant: "secondary" })}
                href={learningLoginUrl(route)}
              >
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
                    <Text muted size="sm">
                      {learning.progress?.lessons.find(
                        (l) => l.slug === lessonSlug
                      )?.requiredPassed
                        ? "Обязательные задания этого урока выполнены."
                        : "Просмотр видео и чтение сами по себе не закрывают обязательные задания."}
                    </Text>
                  )}
                  <div className={styles.entryActions}>
                    {!lessonSlug && next && (
                      <Link
                        className={buttonClass()}
                        href={lessonUrl(address, next)}
                      >
                        {learning.progress?.allRequiredPassed
                          ? "Вернуться к материалам"
                          : "Продолжить обучение"}
                      </Link>
                    )}
                    <Link
                      className={buttonClass({
                        variant: "secondary",
                        size: "sm"
                      })}
                      href="/me/learning"
                    >
                      Моё обучение
                    </Link>
                  </div>
                </>
              ) : learning.entry.membershipStatus === "none" ? (
                learning.entry.customerEntryPolicy === "open" ? (
                  <>
                    <p>
                      Курс бесплатный. Нажимая кнопку, вы вступаете в
                      организацию «{learning.organization.name}» и записываетесь
                      на курс, чтобы сохранять результаты практики.
                    </p>
                    <Button loading={busy} onClick={() => void action("start")}>
                      Начать курс
                    </Button>
                  </>
                ) : (
                  <p>
                    Самостоятельное вступление закрыто. Обратитесь в организацию
                    «{learning.organization.name}» за приглашением.
                  </p>
                )
              ) : learning.entry.membershipStatus !== "active" ? (
                <p>
                  Членство сейчас неактивно. Для доступа обратитесь в
                  организацию.
                </p>
              ) : learning.entry.enrollmentStatus === "withdrawn" ||
                learning.entry.enrollmentStatus === "cancelled" ? (
                <p>
                  Эта запись на курс закрыта. Для повторного обучения обратитесь
                  в организацию.
                </p>
              ) : (
                <>
                  <p>
                    Вы состоите в организации. Запишитесь на бесплатный курс,
                    чтобы сохранять результаты практики.
                  </p>
                  <Button loading={busy} onClick={() => void action("enroll")}>
                    Записаться на бесплатный курс
                  </Button>
                </>
              )}
            </>
          )}
          {message && <Alert tone="success">{message}</Alert>}
          {error && (
            <>
              <Alert tone="danger">{error}</Alert>
              <Button
                variant="secondary"
                disabled={busy || loading}
                onClick={() => setReload((x) => x + 1)}
              >
                Обновить состояние
              </Button>
            </>
          )}
        </Stack>
      </Surface>
    </section>
  );
}
