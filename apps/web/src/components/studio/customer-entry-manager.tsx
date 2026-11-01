"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  organizationCustomerEntryPolicySchema,
  updateCustomerEntryPolicyRequestSchema,
  type CustomerEntryPolicy
} from "@platform/contracts";
import { browserApiRequest } from "../../lib/public-api";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { StudioError, studioRequest } from "./studio-api";
import styles from "./studio.module.css";

function errorMessage(error: unknown) {
  if (error instanceof StudioError && error.status === 401)
    return "Войдите в Studio.";
  if (error instanceof StudioError && error.status === 403)
    return "Только администратор организации может управлять вступлением.";
  if (error instanceof StudioError && error.status === 404)
    return "Организация недоступна.";
  return error instanceof Error ? error.message : "Запрос не завершился.";
}

export function CustomerEntryManager({ organizationId }: { organizationId: string }) {
  const path = `organizations/${organizationId}/customer-entry-policy`;
  const [policy, setPolicy] = useState<CustomerEntryPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [confirm, setConfirm] = useState<CustomerEntryPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function initial() {
      try {
        const canonical = organizationCustomerEntryPolicySchema.parse(
          await studioRequest(path)
        );
        if (!cancelled) setPolicy(canonical.policy);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void initial();
    return () => { cancelled = true; };
  }, [path]);

  async function reload() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const canonical = organizationCustomerEntryPolicySchema.parse(
        await studioRequest(path)
      );
      setPolicy(canonical.policy);
      setNeedsReload(false);
      setConfirm(null);
      setNotice("Текущее состояние получено с сервера.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  async function change(next: CustomerEntryPolicy) {
    if (
      inFlight.current || needsReload || policy === null ||
      next === policy || confirm !== next
    ) return;
    const command = updateCustomerEntryPolicyRequestSchema.parse({ policy: next });
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await browserApiRequest(
        `/v1/${path}`,
        { method: "PUT", body: JSON.stringify(command) }
      );
      if (!response.ok) {
        const reason = response.status === 401
          ? "Необходимо войти в аккаунт."
          : response.status === 403
            ? "Недостаточно прав или неверный Origin запроса."
            : "Не удалось подтвердить изменение политики.";
        throw new StudioError(response.status, reason);
      }
      const result = organizationCustomerEntryPolicySchema.parse(await response.json());
      if (result.policy !== next) throw new Error("Ответ сервера не совпадает с выбранной политикой.");
      setPolicy(result.policy);
      setConfirm(null);
      setNotice(next === "open"
        ? "Самостоятельное вступление разрешено. Ученик начинает бесплатный курс одной кнопкой: она по очереди оформляет вступление и запись."
        : "Самостоятельное вступление закрыто. Уже активные участники не исключаются.");
    } catch (e) {
      // PUT may have committed even if the response was lost.
      // A new canonical GET is required before offering another write.
      setNeedsReload(true);
      setConfirm(null);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  return (
    <div className={styles.sections}>
      <Link href="/studio">← К организациям</Link>
      <header>
        <h1>Вступление новых учеников</h1>
        <p>Эта настройка принадлежит организации, а не отдельному курсу.</p>
      </header>

      <section className={styles.card}>
        <h2>Самостоятельное вступление</h2>
        {loading && <p role="status">Загрузка политики…</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {!loading && (
          <button type="button" disabled={busy} onClick={() => void reload()}>
            Обновить состояние
          </button>
        )}
        {policy && (
          <>
            <p role="status">
              Сейчас: <strong>{policy === "open" ? "Вступление открыто" : "Вступление закрыто"}</strong>
            </p>
            <p>{policy === "open"
              ? "Новые зарегистрированные пользователи могут сами вступать в организацию. Это не записывает их на курс."
              : "Новые пользователи не могут самостоятельно вступить. Публичные страницы курсов можно читать, но самостоятельная запись потребует вступления."}</p>
            {!needsReload && confirm === null && (
              <button type="button" disabled={busy} onClick={() => setConfirm(policy === "open" ? "closed" : "open")}>
                {policy === "open" ? "Закрыть самостоятельное вступление" : "Разрешить самостоятельное вступление"}
              </button>
            )}
            {!needsReload && confirm !== null && (
              <div role="group" aria-label="Подтверждение политики вступления">
                <p>
                  {confirm === "open"
                    ? "Подтвердите: все зарегистрированные пользователи смогут запросить вступление в эту организацию. Курсы и записи не создаются автоматически."
                    : "Подтвердите: новые пользователи больше не смогут вступать самостоятельно. Существующие участники сохранят доступ в пределах своих прав."}
                </p>
                <div className={styles.actions}>
                  <button type="button" className={styles.primary} disabled={busy}
                    onClick={() => void change(confirm)}>
                    {confirm === "open" ? "Подтвердить открытие вступления" : "Подтвердить закрытие вступления"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setConfirm(null)}>Отмена</button>
                </div>
              </div>
            )}
          </>
        )}
        {needsReload && (
          <p role="alert">
            Результат последнего изменения не подтверждён. Нажмите «Обновить состояние»,
            чтобы получить политику с сервера перед повторным действием.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2>Как ученики получают доступ</h2>
        <p>
          Даже при открытом вступлении пользователь должен зарегистрироваться,
          самостоятельно вступить в организацию и отдельно записаться на
          опубликованный бесплатный курс. Эта настройка не меняет видимость
          Offering, роли участников или их прогресс.
        </p>
        <p>
          Для публикации курса используйте раздел «Доступ и ссылка»
          в списке опубликованных курсов Studio.
        </p>
      </section>
      {error?.includes("Войдите") && <Link href={learningLoginUrl("/studio")}>Войти в Studio</Link>}
    </div>
  );
}
