"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ownOrganizationsSchema,
  organizationSchema,
  studioCourseListSchema,
  type StudioCourseList
} from "@platform/contracts";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { studioRequest, StudioError } from "../../components/studio/studio-api";
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
    [login, setLogin] = useState(false);
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
      .catch((e) => {
        if (!cancelled) {
          setLogin(e instanceof StudioError && e.status === 401);
          setError(e.message);
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
      setError((e as Error).message);
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
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = event.currentTarget,
      data = new FormData(form);
    try {
      const org = organizationSchema.parse(
        await studioRequest("me/organizations", {
          slug: data.get("slug"),
          name: data.get("name")
        })
      );
      setOrganizations((old) => [org, ...old]);
      form.reset();
      await select(org);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Studio</h1>
      <p>Создавайте курс, проверяйте черновик и публикуйте новую версию.</p>
      {!ready && <p role="status">Загрузка…</p>}
      {error && <p role="alert">{error}</p>}
      {login ? (
        <Link href={learningLoginUrl("/studio")}>Войти в Studio</Link>
      ) : (
        ready && (
          <>
            <section className={styles.card}>
              <h2>Ваши организации</h2>
              {organizations.length === 0 && (
                <p>Создайте организацию, чтобы начать авторинг.</p>
              )}
              <div className={styles.actions}>
                {organizations.map((o) => (
                  <button
                    key={o.id}
                    disabled={busy}
                    aria-pressed={selected?.id === o.id}
                    onClick={() => select(o)}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
              {cursor && (
                <button disabled={busy} onClick={loadOrganizations}>
                  Ещё организации
                </button>
              )}
            </section>
            {selected && courses && (
              <section className={styles.card}>
                <h2>Курсы · {selected.name}</h2>
                {courses.canCreate && (
                  <Link href={`/studio/${selected.id}/new`}>Создать курс</Link>
                )}
                {courses.courses.length === 0 && (
                  <p>Пока нет доступных курсов.</p>
                )}
                <ul>
                  {courses.courses.map((c) => (
                    <li key={c.courseId}>
                      <Link href={`/studio/${selected.id}/${c.courseId}`}>
                        {c.title}
                      </Link>{" "}
                      · {c.status === "draft" ? "Черновик" : "Опубликовано"},
                      версия {c.versionNumber}
                      {c.status === "published" && (
                        <>
                          {" "}·{" "}
                          <Link href={`/studio/${selected.id}/${c.courseId}/offerings`}>
                            Доступ и ссылка
                          </Link>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {courses.nextCursor && (
                  <button
                    disabled={busy}
                    onClick={() => select(selected, courses.nextCursor!)}
                  >
                    Ещё курсы
                  </button>
                )}
              </section>
            )}
            <details className={styles.card}>
              <summary>Создать организацию</summary>
              <form onSubmit={createOrganization}>
                <label>
                  Название организации
                  <input name="name" required maxLength={160} />
                </label>
                <label>
                  Адрес организации (slug)
                  <input
                    name="slug"
                    required
                    minLength={2}
                    maxLength={63}
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  />
                </label>
                <button type="submit" disabled={busy}>
                  Создать организацию
                </button>
              </form>
            </details>
          </>
        )
      )}
    </>
  );
}
