import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checkout = readFileSync(
  new URL("../../app/checkout/paddle/[purchaseId]/checkout.module.css", import.meta.url),
  "utf8"
);
const purchase = readFileSync(
  new URL("../../app/purchases/[purchaseId]/purchase.module.css", import.meta.url),
  "utf8"
);

describe.each([
  ["Paddle return", checkout],
  ["purchase reconciliation", purchase]
] as const)("%s theme surfaces", (_, css) => {
  it("uses the same semantic colors as public learning instead of a hard-coded white card", () => {
    expect(css).toContain("background: var(--surface-elevated)");
    expect(css).toContain("color: var(--text-primary)");
    expect(css).toContain("border: 1px solid var(--border-default)");
    expect(css).toContain("color: var(--text-secondary)");
    expect(css).toContain("color: var(--status-danger)");
    // Dedicated accent swatches are allowed in the appearance picker but
    // user-facing payment/purchase status panels have no fixed-color exception.
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/\brgba?\(/i);
  });

  it("does not overflow on mobile or narrow zoom viewports", () => {
    expect(css).toContain("width: min(640px, 100%)");
    expect(css).toContain("min-width: 0");
    expect(css).toContain("overflow-wrap: anywhere");
  });
});

it("keeps canonical purchase action accessible under the selected accent", () => {
  expect(purchase).toContain("background: var(--action-primary)");
  expect(purchase).toContain("color: var(--text-on-action)");
  expect(purchase).toContain("min-height: 44px");
  expect(purchase).toContain("outline: 3px solid var(--focus-ring)");
  expect(purchase).toContain("color: var(--status-success)");
});
