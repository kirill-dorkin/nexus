"use client";

import {
  publicPurchaseSchema,
  type PublicPurchase
} from "@platform/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  apiError,
  browserApiRequest,
  PublicApiError
} from "../../../lib/public-api";
import styles from "./purchase.module.css";

const pollDelayMs = 2000;
const maxAutomaticReads = 30;

function formatMoney(purchase: PublicPurchase): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: purchase.currency
  }).format(purchase.amountMinor / 100);
}

export function PurchaseStatus({ purchaseId }: Readonly<{ purchaseId: string }>) {
  const [purchase, setPurchase] = useState<PublicPurchase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const automaticReads = useRef(0);

  const refresh = useCallback(async (): Promise<PublicPurchase | null> => {
    setError(null);
    try {
      const response = await browserApiRequest(
        `/v1/me/purchases/${encodeURIComponent(purchaseId)}`
      );
      if (response.status === 401) {
        throw new PublicApiError(401, "Сессия завершилась. Войдите в аккаунт снова.");
      }
      if (response.status === 404) {
        throw new PublicApiError(404, "Покупка не найдена для текущего аккаунта.");
      }
      if (!response.ok) throw await apiError(response);
      const next = publicPurchaseSchema.parse(await response.json());
      setPurchase(next);
      return next;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Не удалось проверить статус покупки."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      if (!active) return;
      automaticReads.current += 1;
      const current = await refresh();
      if (
        active &&
        current?.status === "pending" &&
        automaticReads.current < maxAutomaticReads
      ) {
        timer = setTimeout(() => void run(), pollDelayMs);
      }
    };

    void run();
    return () => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [refresh]);

  if (loading && purchase === null) {
    return <p className={styles.status}>Получаем канонический статус покупки…</p>;
  }

  if (error !== null && purchase === null) {
    return (
      <div className={styles.statusBox}>
        <p className={styles.error} role="alert">{error}</p>
        <button className={styles.button} type="button" onClick={() => void refresh()}>
          Проверить снова
        </button>
      </div>
    );
  }

  if (purchase === null) return null;

  return (
    <div className={styles.statusBox} aria-live="polite">
      <p className={purchase.status === "paid" ? styles.success : styles.status}>
        {purchase.status === "paid"
          ? "Оплата подтверждена платформой."
          : "Платёж ещё обрабатывается. Эта страница обновит статус автоматически."}
      </p>
      <dl className={styles.details}>
        <div><dt>Сумма</dt><dd>{formatMoney(purchase)}</dd></div>
        <div><dt>Статус</dt><dd>{purchase.status === "paid" ? "Оплачено" : "Ожидается"}</dd></div>
      </dl>
      {purchase.status === "pending" ? (
        <button className={styles.button} type="button" onClick={() => void refresh()}>
          Проверить сейчас
        </button>
      ) : null}
      {error !== null ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
