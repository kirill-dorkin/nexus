import type { Page } from "@playwright/test";
// Test-only accounts that exist solely in the disposable e2e database.
export const OWNER = {
  email: "e2e-owner@example.test",
  password: "e2e-owner-password-0001"
} as const;

/** A fresh learner per test run, so registration is exercised every time. */
export function newLearner() {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    email: `e2e-learner-${id}@example.test`,
    password: "e2e-learner-password-0001",
    name: "Ученик E2E"
  } as const;
}

/** Ticks both required consents of the registration form (ADR-0083). */
export async function acceptLegalDocuments(page: Page) {
  await page
    .getByRole("checkbox", { name: /пользовательского соглашения/ })
    .check();
  await page
    .getByRole("checkbox", { name: /обработку моих персональных данных/ })
    .check();
}
