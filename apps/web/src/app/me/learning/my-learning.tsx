"use client";
import { itemAt } from "../../../lib/item-at";
import { type OwnLearningList } from "@platform/contracts";
import { clientOwnLearningListSchema as ownLearningListSchema } from "@platform/contracts/client";
import { useState } from "react";
import { useApiResource } from "../../../lib/hooks/api-resource";
import Link from "next/link";
import { browserApiRequest } from "../../../lib/public-api";
import { learningLoginUrl } from "../../../lib/learning-return-to";
import { courseUrl, lessonUrl } from "../../../lib/public-learning-routes";
import { CourseProgress } from "../../../components/learning/course-progress";
import { CourseSkillsCount } from "../../../components/learning/course-skills";
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
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { LearningPageHeading } from "../../../components/learning/learning-page-heading";
import { LearningLoading } from "../../../components/learning/learning-loading";
import styles from "../../../components/learning/flow.module.css";
export function MyLearning() {
  const [version, setVersion] = useState(0);
  const [resource, setResource] = useApiResource(
    "/v1/me/learning",
    ownLearningListSchema,
    version
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const reload = () => {
    setError(null);
    setVersion((x) => x + 1);
  };
  const loading = resource.status === "loading";
  const anonymous = resource.status === "anonymous";
  const list: OwnLearningList =
    resource.status === "ready"
      ? resource.data
      : { courses: [], nextCursor: null };
  const courses = list.courses;
  const cursor = list.nextCursor;
  const shownError =
    error ??
    (resource.status === "error" ? "Не удалось загрузить обучение." : null);
  const completedCount = courses.filter(
    (course) => course.entry.enrollmentStatus === "completed"
  ).length;
  const inProgressCount = courses.length - completedCount;
  async function more() {
    if (!cursor) return;
    setBusy(true);
    setError(null);
    try {
      const r = await browserApiRequest(
        `/v1/me/learning?after=${encodeURIComponent(cursor)}`
      );
      if (r.status === 401) {
        setResource({ status: "anonymous" });
        return;
      }
      if (!r.ok) throw new Error("Unavailable");
      const data = ownLearningListSchema.parse(await r.json());
      setResource({
        status: "ready",
        data: {
          courses: [
            ...new Map(
              [...courses, ...data.courses].map((c) => [
                `${c.organization.slug}/${c.offering.slug}`,
                c
              ])
            ).values()
          ],
          nextCursor: data.nextCursor
        }
      });
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
      setResource({ status: "anonymous" });
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
      {!loading && !anonymous && !shownError && !courses.length && (
        <Surface padding="none">
          <EmptyState
            title="Вы пока не записаны на доступные курсы."
            action={
              <Link className={buttonClass()} href="/courses">
                Выбрать курс <ArrowRightIcon size={18} aria-hidden="true" />
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
              c.progress?.nextLessonSlug ?? itemAt(c.course.lessons, 0).slug;
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
                    <Link href={courseUrl(c)}>{c.course.title}</Link>
                  </h2>
                  <Text muted size="sm">
                    {c.course.description}
                  </Text>
                </div>
                <div className={styles.savedProgress}>
                  <CourseProgress learning={c} />
                  <CourseSkillsCount
                    organizationSlug={c.organization.slug}
                    offeringSlug={c.offering.slug}
                  />
                  <Link className={buttonClass()} href={lessonUrl(c, next)}>
                    {c.progress?.allRequiredPassed
                      ? "Вернуться к материалам"
                      : "Продолжить"}
                    <ArrowRightIcon size={18} aria-hidden="true" />
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
      {shownError && (
        <Surface className={styles.learningError} appearance="quiet">
          <Alert tone="danger" title="Обучение сейчас недоступно">
            {shownError}
          </Alert>
          <Button variant="secondary" disabled={busy} onClick={reload}>
            Повторить загрузку
          </Button>
        </Surface>
      )}
      {!anonymous && !loading && !shownError && (
        <Inline gap="sm" className={styles.savedGrid}>
          <Button variant="secondary" disabled={busy} onClick={reload}>
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
