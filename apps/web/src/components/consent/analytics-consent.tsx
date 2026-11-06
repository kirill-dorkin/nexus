"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@platform/ui";

import {
  POSTHOG_KEY,
  identifyLearner,
  productAnalytics,
  readConsent,
  setConsent,
  type AnalyticsConsent
} from "../../lib/analytics/product-analytics";
import { browserApiRequest } from "../../lib/public-api";
import styles from "./analytics-consent.module.css";

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Links events to the account once the visitor is signed in and has accepted (ADR-0086). */
async function identifyIfSignedIn() {
  try {
    const response = await browserApiRequest("/v1/me");
    if (!response.ok) return;
    const me = (await response.json()) as { id?: unknown };
    if (typeof me.id === "string") await identifyLearner(me.id);
  } catch {
    // Analytics never gets in the way of the page.
  }
}

/**
 * Starts product analytics after the page is idle and asks for consent once (ADR-0086).
 * Renders nothing when analytics is off (no project key) or the visitor has already chosen.
 */
export function AnalyticsConsent() {
  const [consent, setLocal] = useState<AnalyticsConsent | null>(null);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    const start = () => {
      // The banner appears a moment after the page, not over its first paint.
      const current = readConsent(storage());
      setLocal(current);
      void productAnalytics();
      if (current === "granted") void identifyIfSignedIn();
    };
    // Safari has no requestIdleCallback; a short delay keeps analytics off the critical path.
    const id = window.setTimeout(start, 2000);
    return () => window.clearTimeout(id);
  }, []);

  if (consent !== "pending") return null;
  const choose = (value: "granted" | "denied") => {
    setLocal(value);
    void setConsent(value).then(() => {
      if (value === "granted") void identifyIfSignedIn();
    });
  };
  return (
    <section className={styles.banner} aria-label="Согласие на cookies">
      <p className={styles.text}>
        Мы используем cookies и аналитику, чтобы понимать, какие уроки помогают,
        а где ученики застревают, и улучшать курсы. Подробнее — в{" "}
        <Link href="/privacy">политике конфиденциальности</Link>.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={buttonClass({ size: "sm" })}
          onClick={() => choose("granted")}
        >
          Принять
        </button>
        <button
          type="button"
          className={buttonClass({ variant: "secondary", size: "sm" })}
          onClick={() => choose("denied")}
        >
          Только необходимые
        </button>
      </div>
    </section>
  );
}
