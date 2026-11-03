"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ownOrganizationsSchema,
  studioCourseListSchema,
  type StudioCourseList
} from "@platform/contracts";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { errorMessage, studioRequest, StudioError } from "../../components/studio/studio-api";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Eyebrow,
  Heading,
  Skeleton,
  Text,
  buttonClass
} from "@platform/ui";
import styles from "../../components/studio/studio.module.css";
type Org = { id: string; slug: string; name: string };
export function StudioHome() {
  const [organizations, setOrganizations] = useState<Org[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [selected, setSelected] = useState<Org | null>(null),
    [courses, setCourses] = useState<StudioCourseList | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [login, setLogin] = useState(false),
    [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    studioRequest("me/organizations")
      .then((value) => {
        const data = ownOrganizationsSchema.parse(value);
        if (!cancelled) {
          setOrganizations(data.organizations);
          setCursor(data.nextCursor);
          setReady(true);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLogin(e instanceof StudioError && e.status === 401);
          setUnavailable(!(e instanceof StudioError && e.status === 401));
          setError(errorMessage(e));
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function loadOrganizations() {
    setBusy(true);
    try {
      const data = ownOrganizationsSchema.parse(
        await studioRequest(`me/organizations?after=${cursor}`)
      );
      setOrganizations((old) => [...old, ...data.organizations]);
      setCursor(data.nextCursor);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function select(org: Org, after?: string) {
    setBusy(true);
    setError(null);
    if (!after) {
      setSelected(org);
      setCourses(null);
    }
    try {
      const data = studioCourseListSchema.parse(
        await studioRequest(
          `organizations/${org.id}/studio/courses${after ? `?after=${after}` : ""}`
        )
      );
      setCourses((old) =>
        after && old
          ? { ...data, courses: [...old.courses, ...data.courses] }
          : data
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const nextCourseCursor = courses?.nextCursor ?? null;
  return (
    <>
      <header className={styles.pageHeading}>
        <Eyebrow>Рабочая среда автора</Eyebrow>
        <Heading level={1} size="display">
          Studio
        </Heading>
        <Text muted>
          Создавайте курс, проверяйте черновик и публикуйте новую версию.
        </Text>
      </header>
      {!ready && (
        <div role="status" className={styles.loading}>
          <Text muted>Загружаем ваши организации…</Text>
          <Skeleton style={{ height: "5rem" }} />
        </div>
      )}
      {error && !login && (
        <Alert tone="danger" className={styles.notice}>
          {error}
        </Alert>
      )}
      {login ? (
        <EmptyState
          title="Ваша авторская среда"
          action={
            <Link className={buttonClass()} href={learningLoginUrl("/studio")}>
              Войти в Studio
            </Link>
          }
        >
          Войдите в аккаунт, чтобы открыть свои организации и курсы. Материалы
          Studio доступны только авторам с нужными правами.
        </EmptyState>
      ) : unavailable ? (
        <EmptyState
          title="Studio пока недоступна"
          action={
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Повторить загрузку
            </Button>
          }
        >
          Не удалось получить ваши организации. Рабочие данные не заменены
          пустым списком.
        </EmptyState>
      ) : (
        ready && (
          <div className={styles.homeLayout}>
            <aside className={styles.organizationRail}>
              <Heading level={2} size="small">
                Ваши организации
              </Heading>
              {!organizations.length && (
                <Text muted size="sm">
                  Организации доступны только назначенным сотрудникам. Если вам нужен доступ, обратитесь к владельцу платформы.
                </Text>
              )}
              <div
                className={styles.organizationList}
                role="group"
                aria-label="Выбор организации"
              >
                {organizations.map((o) => (
                  <Button
                    key={o.id}
                    variant="ghost"
                    className={styles.organizationChoice}
                    disabled={busy}
                    aria-label={o.name}
                    aria-pressed={selected?.id === o.id}
                    onClick={() => select(o)}
                  >
                    <strong>{o.name}</strong>
                    <span>{o.slug}</span>
                  </Button>
                ))}
              </div>
              {cursor && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={loadOrganizations}
                >
                  Ещё организации
                </Button>
              )}
            </aside>
            <section
              className={styles.courseWorkspace}
              aria-label="Курсы организации"
              aria-busy={busy}
            >
              {selected ? (
                <>
                  <div className={styles.sectionHeading}>
                    <div>
                      <Eyebrow>{selected.name}</Eyebrow>
                      <Heading level={2} size="section">
                        Курсы
                      </Heading>
                    </div>
                    {courses?.canCreate && (
                      <Link
                        className={buttonClass()}
                        href={`/studio/${selected.id}/new`}
                      >
                        Создать курс
                      </Link>
                    )}
                  </div>
                  <p className={styles.courseManageLink}>
                    <Link href={`/studio/${selected.id}/entry-policy`}>
                      Вступление учеников · настройки организации
                    </Link>
                  </p>
                  {!courses && !error && (
                    <div role="status" className={styles.loading}>
                      <Text muted>Загружаем курсы…</Text>
                      <Skeleton style={{ height: "5rem" }} />
                      <Skeleton style={{ height: "5rem" }} />
                    </div>
                  )}
                  {!courses && error && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => select(selected)}
                    >
                      Повторить загрузку курсов
                    </Button>
                  )}
                  {courses?.courses.length === 0 && (
                    <EmptyState title="Пока нет доступных курсов">
                      {courses.canCreate
                        ? "Начните с нового курса: добавьте описание, уроки и задания."
                        : "Доступные вам курсы появятся здесь. Право создания проверяется организацией."}
                    </EmptyState>
                  )}
                  {courses && (
                    <ul className={styles.courseList}>
                      {courses.courses.map((c) => (
                        <li key={c.courseId}>
                          <Link
                            className={styles.courseRow}
                            href={`/studio/${selected.id}/${c.courseId}`}
                          >
                            <div>
                              <div className={styles.courseMeta}>
                                <Badge
                                  tone={
                                    c.status === "draft" ? "accent" : "neutral"
                                  }
                                >
                                  {c.status === "draft"
                                    ? "Черновик"
                                    : "Опубликовано"}
                                </Badge>
                                <Text muted size="sm">
                                  Версия {c.versionNumber}
                                </Text>
                              </div>
                              <Heading level={3} size="section">
                                {c.title}
                              </Heading>
                            </div>
                            <span aria-hidden="true">↗</span>
                          </Link>
                          {c.status === "published" && (
                            <Link className={styles.courseManageLink}
                              href={`/studio/${selected.id}/${c.courseId}/offerings`}>
                              Доступ и ссылка
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {nextCourseCursor !== null && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => select(selected, nextCourseCursor)}
                    >
                      Ещё курсы
                    </Button>
                  )}
                </>
              ) : (
                <EmptyState
                  title={
                    organizations.length
                      ? "Выберите организацию"
                      : "Нет доступа к Studio"
                  }
                >
                  {organizations.length
                    ? "Откройте организацию слева, чтобы увидеть курсы, доступные вам для авторинга."
                    : "Рабочее пространство открывается сотрудникам, назначенным владельцем платформы. Ученикам создание организаций недоступно."}
                </EmptyState>
              )}
            </section>
          </div>
        )
      )}
    </>
  );
}
