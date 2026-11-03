"use client";

import { useEffect, useRef, useState, type SubmitEvent } from "react";
import Link from "next/link";
import {
  createLearningOfferingRequestSchema,
  learningOfferingListSchema,
  learningOfferingSchema,
  ownOrganizationsSchema,
  studioDraftSchema,
  type LearningOffering,
  type StudioDraft
} from "@platform/contracts";
import { browserApiRequest } from "../../lib/public-api";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { StudioError, studioRequest } from "./studio-api";
import {
  appendOfferingPage,
  isShareableFreeOffering,
  publicOfferingUrl
} from "./offering-publication";
import styles from "./studio.module.css";
import accessStyles from "./offering-manager.module.css";

async function ownOrganizationSlug(organizationId: string): Promise<string> {
  let cursor: string | null = null;
  const seen = new Set<string>();
  for (let page = 0; page < 100; page++) {
    const result = ownOrganizationsSchema.parse(
      await studioRequest(`me/organizations${cursor ? `?after=${cursor}` : ""}`)
    );
    const own = result.organizations.find((organization) => organization.id === organizationId);
    if (own) return own.slug;
    if (result.nextCursor === null) break;
    if (seen.has(result.nextCursor)) throw new Error("Повторяющийся курсор организаций.");
    seen.add(result.nextCursor);
    cursor = result.nextCursor;
  }
  throw new Error("Организация недоступна в вашем аккаунте.");
}

function requestError(error: unknown): string {
  if (error instanceof StudioError && error.status === 401) return "Войдите в Studio и попробуйте снова.";
  if (error instanceof StudioError && error.status === 403) return "У вас нет прав управления доступом к этому курсу.";
  return error instanceof Error ? error.message : "Не удалось выполнить запрос.";
}

export function OfferingManager({
  organizationId,
  courseId
}: {
  organizationId: string;
  courseId: string;
}) {
  const [course, setCourse] = useState<StudioDraft | null>(null);
  const [browserOrigin, setBrowserOrigin] = useState<string | null>(null);
  const [organizationSlug, setOrganizationSlug] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<LearningOffering[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [confirmPublicId, setConfirmPublicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const offeringPath = `organizations/${organizationId}/offerings`;

  async function refresh() {
    const [raw, orgSlug] = await Promise.all([
      studioRequest(`organizations/${organizationId}/studio/courses/${courseId}`),
      ownOrganizationSlug(organizationId)
    ]);
    const latest = studioDraftSchema.parse(raw);
    if (latest.courseId !== courseId) throw new Error("Курс изменился.");
    if (latest.status === "published") {
      const first = learningOfferingListSchema.parse(
        await studioRequest(`${offeringPath}?courseVersionId=${latest.versionId}`)
      );
      setOfferings(appendOfferingPage([], first, latest.versionId));
      setCursor(first.nextCursor);
    } else {
      setOfferings([]);
      setCursor(null);
    }
    setCourse(latest);
    setOrganizationSlug(orgSlug);
    setName(latest.manifest.course.title);
    setSlug(latest.slug);
    setConfirmPublicId(null);
    setUncertain(false);
  }

  useEffect(() => {
    let cancelled = false;
    setBrowserOrigin(window.location.origin);
    // The route changes by remounting this keyed component.
    async function initial() {
      try {
        // Read only. Every later command is still separately authorized by API.
        const [raw, orgSlug] = await Promise.all([
          studioRequest(`organizations/${organizationId}/studio/courses/${courseId}`),
          ownOrganizationSlug(organizationId)
        ]);
        const latest = studioDraftSchema.parse(raw);
        if (latest.courseId !== courseId) throw new Error("Курс изменился.");
        const first = latest.status === "published"
          ? learningOfferingListSchema.parse(
              await studioRequest(`${offeringPath}?courseVersionId=${latest.versionId}`)
            )
          : null;
        if (cancelled) return;
        setCourse(latest);
        setOrganizationSlug(orgSlug);
        setName(latest.manifest.course.title);
        setSlug(latest.slug);
        if (first) {
          setOfferings(appendOfferingPage([], first, latest.versionId));
          setCursor(first.nextCursor);
        }
      } catch (e) {
        if (cancelled) return;
        setLogin(e instanceof StudioError && e.status === 401);
        setError(requestError(e));
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void initial();
    return () => { cancelled = true; };
  }, [organizationId, courseId, offeringPath]);

  async function run(action: () => Promise<void>, failureMayHaveCommitted = false) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      if (failureMayHaveCommitted) setUncertain(true);
      setLogin(e instanceof StudioError && e.status === 401);
      setError(requestError(e));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  async function reload() {
    await run(async () => {
      await refresh();
      setMessage("Загружены актуальные настройки доступа.");
    });
  }

  async function more() {
    if (course?.status !== "published" || !cursor) return;
    const after = cursor;
    await run(async () => {
      const page = learningOfferingListSchema.parse(
        await studioRequest(`${offeringPath}?courseVersionId=${course.versionId}&after=${after}`)
      );
      const combined = appendOfferingPage(offerings, page, course.versionId);
      setOfferings(combined);
      setCursor(page.nextCursor);
    });
  }

  async function create(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (course?.status !== "published" || uncertain) return;
    const parsed = createLearningOfferingRequestSchema.safeParse({
      courseVersionId: course.versionId,
      name: name.trim(),
      slug: slug.trim(),
      deliveryMode: "self_paced",
      accessMode: "membership"
    });
    if (!parsed.success) {
      setError("Проверьте название и адрес: slug должен состоять из строчных латинских букв, цифр и дефисов.");
      return;
    }
    if (offerings.some((item) => item.slug === parsed.data.slug)) {
      setError("Offering с таким адресом уже есть. Используйте существующий.");
      return;
    }
    await run(async () => {
      // A successful create is always private. Publishing is a distinct action.
      const created = learningOfferingSchema.parse(
        await studioRequest(offeringPath, parsed.data)
      );
      if (
        created.courseVersionId !== course.versionId ||
        created.organizationId !== organizationId ||
        created.visibility !== "private"
      ) throw new Error("Получен неожиданный ответ сервера. Обновите список перед повтором.");
      await refresh();
      setMessage("Доступ создан приватным. Проверьте настройки и откройте его отдельной кнопкой.");
    }, true);
  }

  async function changeVisibility(offering: LearningOffering, visibility: "public" | "private") {
    if (offering.courseVersionId !== course?.versionId || uncertain) return;
    if (visibility === "public" && confirmPublicId !== offering.id) return;
    await run(async () => {
      const response = await browserApiRequest(
        `/v1/${offeringPath}/${offering.id}/visibility`,
        { method: "PATCH", body: JSON.stringify({ visibility }) }
      );
      if (!response.ok) {
        const message = response.status === 401
          ? "Войдите в Studio."
          : response.status === 403
            ? "Недостаточно прав на изменение видимости."
            : response.status === 409
              ? "Состояние курса изменилось. Обновите список."
              : "Не удалось проверить изменение видимости. Обновите список перед повтором.";
        throw new StudioError(response.status, message);
      }
      const updated = learningOfferingSchema.parse(await response.json());
      if (
        updated.id !== offering.id ||
        updated.courseVersionId !== course.versionId ||
        updated.organizationId !== organizationId ||
        updated.visibility !== visibility
      ) throw new Error("Сервер вернул неожиданное состояние. Обновите список.");
      setOfferings((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      setConfirmPublicId(null);
      setMessage(visibility === "public" ? "Публичный доступ включён." : "Публичный доступ скрыт.");
    }, true);
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Ссылка скопирована.");
    } catch {
      setMessage("Не удалось скопировать автоматически. Выделите ссылку на странице.");
    }
  }

  return (
    <>
      <Link href={`/studio/${organizationId}/${courseId}`}>← К редактору курса</Link>
      <h1>Доступ к опубликованному курсу</h1>
      <p>Публикация содержимого и открытие доступа — отдельные действия. Новый доступ всегда приватный.</p>
      {!ready && <p role="status">Загрузка…</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {message && <p role="status">{message}</p>}
      {login && <p><Link href={learningLoginUrl("/studio")}>Войти в Studio</Link></p>}
      {ready && !login && course && organizationSlug && (
        <div className={styles.sections}>
          <section className={styles.card}>
            <h2>{course.manifest.course.title}</h2>
            <p>Версия {course.versionNumber} · {course.status === "published" ? "Опубликована" : "Черновик"}</p>
            {course.status !== "published" ? (
              <p role="status">Эта версия ещё не опубликована. Сначала опубликуйте её в редакторе. Существующие Offerings других версий сохраняются и не изменяются автоматически.</p>
            ) : (
              <>
                <p>Выберите существующий доступ или создайте новый. Редактирование курса не изменяет уже опубликованную версию.</p>
                <button disabled={busy} type="button" onClick={() => void reload()}>
                  Обновить доступы
                </button>
              </>
            )}
          </section>

          {course.status === "published" && (
            <>
              <section className={styles.card}>
                <h2>Существующие доступы</h2>
                {offerings.length === 0 && <p>Для этой опубликованной версии доступов пока нет.</p>}
                <div className={accessStyles.list}>
                  {offerings.map((offering) => {
                    const shareable = isShareableFreeOffering(offering);
                    const url = shareable && browserOrigin
                      ? publicOfferingUrl(browserOrigin, organizationSlug, offering.slug)
                      : null;
                    return (
                      <article className={accessStyles.item} key={offering.id}>
                        <div className={accessStyles.titleRow}>
                          <h3>{offering.name}</h3>
                          <span className={accessStyles.state}>
                            {offering.visibility === "public" ? "Публичный" : "Приватный"} · {offering.status === "open" ? "Открыт" : offering.status === "closed" ? "Закрыт" : "Архив"}
                          </span>
                        </div>
                        <p>Адрес: <code>{offering.slug}</code></p>
                        {offering.deliveryMode !== "self_paced" || offering.accessMode !== "membership" ? (
                          <p>Этот доступ не относится к бесплатному самостоятельному обучению.</p>
                        ) : null}
                        {url && (
                          <div className={accessStyles.link}>
                            <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                            <button type="button" disabled={busy} onClick={() => void copyLink(url)}>Скопировать ссылку</button>
                          </div>
                        )}
                        {offering.visibility === "private" ? (
                          <div className={styles.actions}>
                            {confirmPublicId === offering.id ? (
                              <>
                                <p>Подтвердите: опубликованный курс станет доступен без входа для просмотра. Вступление и запись останутся отдельными действиями.</p>
                                <button type="button" className={styles.primary} disabled={busy || uncertain || offering.status !== "open"} onClick={() => void changeVisibility(offering, "public")}>
                                  Подтвердить открытие доступа
                                </button>
                                <button type="button" disabled={busy} onClick={() => setConfirmPublicId(null)}>Отмена</button>
                              </>
                            ) : (
                              <button type="button" disabled={busy || uncertain || offering.status !== "open" || offering.deliveryMode !== "self_paced" || offering.accessMode !== "membership"} onClick={() => setConfirmPublicId(offering.id)}>
                                Открыть публичный доступ
                              </button>
                            )}
                          </div>
                        ) : (
                          <button type="button" disabled={busy || uncertain} onClick={() => void changeVisibility(offering, "private")}>
                            Скрыть публичный доступ
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
                {cursor && (
                  <button type="button" disabled={busy} onClick={() => void more()}>
                    Загрузить ещё
                  </button>
                )}
              </section>

              <section className={styles.card}>
                <h2>Новый доступ</h2>
                <p>Для первого бесплатного курса используйте самостоятельный формат и доступ по членству. Новое предложение останется приватным, пока вы не подтвердите публикацию.</p>
                <form onSubmit={(event) => void create(event)}>
                  <label>
                    Название
                    <input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} disabled={busy || uncertain} />
                  </label>
                  <label>
                    Адрес курса (slug)
                    <input required minLength={2} maxLength={63} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value)} disabled={busy || uncertain} />
                  </label>
                  <button className={styles.primary} disabled={busy || uncertain} type="submit">
                    Создать приватный доступ
                  </button>
                </form>
                {uncertain && (
                  <p role="alert">Результат предыдущего изменения не подтверждён. Не повторяйте запрос: сначала обновите список, чтобы избежать дубликатов.</p>
                )}
              </section>
            </>
          )}
          <p className={accessStyles.note}>
            Для новой регистрации может потребоваться отдельно разрешить вступление в организацию (customer entry policy). Публичная ссылка сама по себе не выдаёт членство, запись на курс или платный доступ.
          </p>
        </div>
      )}
    </>
  );
}
