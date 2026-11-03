import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Runs axe (WCAG 2.2 A/AA rules) on the current page and fails on any
 * serious or critical violation, listing the rule and the first elements.
 */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    // Runs inside each frame instead of opening a helper page, which the
    // installed-Chrome channel rejects. Opaque-origin sandboxes (learner code,
    // the YouTube player) stay out of reach either way: they are not our markup.
    .setLegacyMode(true)
    .analyze();
  const blocking = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help} — ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join("; ")}`
    );
  expect(blocking, `Accessibility on ${page.url()}`).toEqual([]);
}
