"use client";
import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@platform/ui";

import { track } from "../../lib/analytics/product-analytics";
import styles from "./flow.module.css";

/**
 * Shown in place of a check result when the API answers 402 `subscription_required`
 * (ADR-0087 §4): the first chapter is free, later chapters record progress with a subscription.
 */
export function SubscriptionPaywall({
  organizationSlug,
  offeringSlug,
  lessonSlug
}: {
  organizationSlug: string;
  offeringSlug: string;
  lessonSlug: string;
}) {
  useEffect(() => {
    void track("paywall_viewed", {
      organization: organizationSlug,
      offering: offeringSlug,
      lesson: lessonSlug
    });
  }, [organizationSlug, offeringSlug, lessonSlug]);
  return (
    <div className={styles.quizSignup} role="status">
      <strong>Дальше — по подписке</strong>
      <p>
        Первая глава каждого курса бесплатна. Чтобы проверять задания дальше,
        подтверждать навыки и растить персонажей, оформите подписку. Всё, что вы
        уже прошли, сохранится.
      </p>
      <div className={styles.quizSignupActions}>
        <Link
          className={buttonClass({ size: "md" })}
          href={`/subscription?from=${encodeURIComponent(`${offeringSlug}/${lessonSlug}`)}`}
        >
          Оформить подписку
        </Link>
      </div>
    </div>
  );
}

/** True when the API refused a check because the learner needs a subscription. */
export const isPaymentRequired = (response: Response) =>
  response.status === 402;
