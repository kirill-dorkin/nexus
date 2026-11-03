import { expect, test } from "@playwright/test";

import { PAGES, VITALS } from "../budgets";
import { measure } from "../vitals";

for (const { path, name, scriptBudget, sql } of PAGES) {
  test(`${name} stays within its performance budget`, async ({ page }) => {
    const cost = await measure(page, path, { scrollToEnd: Boolean(sql) });
    const report = `${path}: ${JSON.stringify({ ...cost, sqlRuntime: cost.sqlRuntime.length })}`;

    expect(cost.scriptBytes, `JavaScript of ${report}`).toBeLessThanOrEqual(
      scriptBudget
    );
    expect(cost.lcp, `LCP of ${report}`).toBeGreaterThan(0);
    expect(cost.lcp, `LCP of ${report}`).toBeLessThanOrEqual(VITALS.lcpMs);
    expect(cost.cls, `CLS of ${report}`).toBeLessThanOrEqual(VITALS.cls);
    if (sql)
      expect(cost.sqlRuntime.length, `SQL engine on ${report}`).toBeGreaterThan(
        0
      );
    else expect(cost.sqlRuntime, `SQL engine on ${report}`).toEqual([]);
  });
}
