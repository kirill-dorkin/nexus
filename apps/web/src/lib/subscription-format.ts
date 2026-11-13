import type { SubscriptionBillingPeriod } from "@platform/contracts";

const MONTHS: Record<SubscriptionBillingPeriod, number> = {
  month: 1,
  days_90: 3,
  year: 12
};

export const PERIOD_LABEL: Record<SubscriptionBillingPeriod, string> = {
  month: "Месяц",
  days_90: "3 месяца",
  year: "Год"
};

export const PERIOD_SUFFIX: Record<SubscriptionBillingPeriod, string> = {
  month: "в месяц",
  days_90: "за 3 месяца",
  year: "в год"
};

/** «990 ₽», «$11.99»: whole roubles without kopecks, other currencies with cents. */
export function formatMoney(amountMinor: number, currency: string): string {
  const whole = amountMinor % 100 === 0;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2
  }).format(amountMinor / 100);
}

/** The monthly equivalent, rounded down to whole units, for «575 ₽ в месяц». */
export function perMonth(
  amountMinor: number,
  currency: string,
  period: SubscriptionBillingPeriod
): string {
  return formatMoney(
    Math.floor(amountMinor / MONTHS[period] / 100) * 100,
    currency
  );
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(iso));
}
