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
