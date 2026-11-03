"use client";
import type { LearningOffering } from "@platform/contracts";
import { useBrowserOrigin } from "../../../lib/hooks/browser";
import {
  isShareableFreeOffering,
  publicOfferingUrl
} from "../offering-publication";
import accessStyles from "../offering-manager.module.css";
import styles from "../studio.module.css";
import type { Offerings } from "./use-offerings";

const STATUS = { open: "Открыт", closed: "Закрыт", archived: "Архив" } as const;

/** One offering: its state, public link and visibility controls. */
export function OfferingCard({
  offering,
  organizationSlug,
  manager
}: {
  offering: LearningOffering;
  organizationSlug: string;
  manager: Offerings;
}) {
  const { busy, uncertain, confirmPublicId } = manager;
  // "" while rendering on the server, the page origin in the browser.
  const origin = useBrowserOrigin();
  const freeSelfPaced =
    offering.deliveryMode === "self_paced" &&
    offering.accessMode === "membership";
  const url =
    isShareableFreeOffering(offering) && origin
      ? publicOfferingUrl(origin, organizationSlug, offering.slug)
      : null;
  return (
    <article className={accessStyles.item}>
      <div className={accessStyles.titleRow}>
        <h3>{offering.name}</h3>
        <span className={accessStyles.state}>
          {offering.visibility === "public" ? "Публичный" : "Приватный"} ·{" "}
          {STATUS[offering.status]}
        </span>
      </div>
      <p>
        Адрес: <code>{offering.slug}</code>
      </p>
      {!freeSelfPaced && (
        <p>Этот доступ не относится к бесплатному самостоятельному обучению.</p>
      )}
      {url && (
        <div className={accessStyles.link}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => void manager.copyLink(url)}
          >
            Скопировать ссылку
          </button>
        </div>
      )}
      {offering.visibility === "public" ? (
        <button
          type="button"
          disabled={busy || uncertain}
          onClick={() => void manager.changeVisibility(offering, "private")}
        >
          Скрыть публичный доступ
        </button>
      ) : (
        <div className={styles.actions}>
          {confirmPublicId === offering.id ? (
            <>
              <p>
                Подтвердите: опубликованный курс станет доступен без входа для
                просмотра. Вступление и запись останутся отдельными действиями.
              </p>
              <button
                type="button"
                className={styles.primary}
                disabled={busy || uncertain || offering.status !== "open"}
                onClick={() =>
                  void manager.changeVisibility(offering, "public")
                }
              >
                Подтвердить открытие доступа
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => manager.setConfirmPublicId(null)}
              >
                Отмена
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={
                busy ||
                uncertain ||
                offering.status !== "open" ||
                !freeSelfPaced
              }
              onClick={() => manager.setConfirmPublicId(offering.id)}
            >
              Открыть публичный доступ
            </button>
          )}
        </div>
      )}
    </article>
  );
}
