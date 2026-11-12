"use client";
import { type LearnerLearningCourse } from "@platform/contracts";
import { clientLearnerLearningCourseSchema as learnerLearningCourseSchema } from "@platform/contracts/client";
import { useEffect, useRef, useState } from "react";
import { useApiResource } from "../../lib/hooks/api-resource";
import Link from "next/link";
import { browserApiRequest } from "../../lib/public-api";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { trackCourseStarted } from "../../lib/analytics/product-analytics";
import { entryCommandError } from "./learner-entry-errors";
import {
  HOME_ORGANIZATION_SLUG,
  courseUrl,
  lessonUrl,
  organizationName
} from "../../lib/public-learning-routes";
import { CourseProgress } from "./course-progress";
import { CourseSkills } from "./course-skills";
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
  const [version, setVersion] = useState(0);
  const [resource, setResource] = useApiResource(
    api,
    learnerLearningCourseSchema,
    version
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null);
  const reload = () => setVersion((x) => x + 1);
  useEffect(() => {
    const refresh = () => setVersion((x) => x + 1);
    window.addEventListener("learning-progress-changed", refresh);
    return () =>
      window.removeEventListener("learning-progress-changed", refresh);
  }, []);
  const loading = resource.status === "loading";
  const anonymous = resource.status === "anonymous";
  const learning: LearnerLearningCourse | null =
    resource.status === "ready" ? resource.data : null;
  // A failed command keeps its own explanation across the reload it triggers;
  // only the learner's retry clears it.
  const shownError =
    error ??
    (resource.status === "error"
      ? "Не удалось загрузить состояние обучения. Попробуйте снова."
      : null);
  /** Sends one existing domain command; null means the caller must stop. */
  async function post(kind: "join" | "enroll"): Promise<Response | null> {
    const response = await browserApiRequest(
      kind === "join"
        ? `/v1/public/organizations/${encodeURIComponent(organizationSlug)}/memberships/me`
        : `${api}/enrollment`,
      { method: "POST", body: "{}" }
    );
    if (response.status === 401) {
      setResource({ status: "anonymous" });
      return null;
    }
    if (!response.ok) {
      setError(entryCommandError(response.status));
      return null;
    }
    return response;
  }
  async function enroll(auto = false) {
    const response = await post("enroll");
    if (!response) return false;
    setResource({
      status: "ready",
      data: learnerLearningCourseSchema.parse(await response.json())
    });
    void trackCourseStarted(organizationSlug, offeringSlug, auto);
    setMessage(
      auto
        ? "Курс начат: он появился в «Моём обучении»."
        : "Вы записаны на курс. Результаты практики будут сохраняться."
    );
    // An automatic start tells the program and the character beside the lesson.
    if (auto) window.dispatchEvent(new Event("learning-progress-changed"));
    return true;
  }
  /**
   * One learner gesture, two separate domain commands: explicit Organization
   * entry first, then free self-enrollment. Each keeps its own transaction,
   * idempotency and event; a failed second step leaves a visible retry.
   */
  async function action(kind: "start" | "enroll", auto = false) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (kind === "start") {
        const joined = await post("join");
        if (!joined) return;
        if (!(await enroll(auto))) reload();
        return;
      }
      await enroll(auto);
    } catch {
      setError(
        "Не удалось связаться с сервером. Можно безопасно повторить действие."
      );
    } finally {
      setBusy(false);
    }
  }
  // Opening a lesson starts the course (owner, 2026-11-06): a signed-in learner who reads a
  // lesson of the site's own free course gets it in «Моё обучение» without pressing «Начать
  // курс». Only for the home organization, where entry is the site itself; other
  // organizations keep the explicit button. Runs once per page.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !lessonSlug || resource.status !== "ready")
      return;
    if (organizationSlug !== HOME_ORGANIZATION_SLUG) return;
    const { entry } = resource.data;
    if (entry.enrollmentStatus !== null) return;
    const kind =
      entry.membershipStatus === "active"
        ? "enroll"
        : entry.membershipStatus === "none" &&
            entry.customerEntryPolicy === "open"
          ? "start"
          : null;
    if (!kind) return;
    autoStarted.current = true;
    void Promise.resolve().then(() => action(kind, true));
  });
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
                  {!lessonSlug && (
                    <CourseSkills
                      organizationSlug={organizationSlug}
                      offeringSlug={offeringSlug}
                      version={version}
                    />
                  )}
                </>
              ) : learning.entry.membershipStatus === "none" ? (
                learning.entry.customerEntryPolicy === "open" ? (
                  <>
                    <p>
                      Курс бесплатный. Нажимая кнопку, вы вступаете в
                      организацию «{organizationName(learning.organization)}» и
                      записываетесь на курс, чтобы сохранять результаты
                      практики.
                    </p>
                    <Button loading={busy} onClick={() => void action("start")}>
                      Начать курс
                    </Button>
                  </>
                ) : (
                  <p>
                    Самостоятельное вступление закрыто. Обратитесь в организацию
                    «{organizationName(learning.organization)}» за приглашением.
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
          {shownError && (
            <>
              <Alert tone="danger">{shownError}</Alert>
              <Button
                variant="secondary"
                disabled={busy || loading}
                onClick={() => {
                  setError(null);
                  reload();
                }}
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
