import { expect, test, type Page } from "@playwright/test";

// The Web security headers (ADR-0069) are present and the pages work under
// them: no Content Security Policy violation, including the practice frames,
// the JavaScript sandbox and the in-browser PostgreSQL engine.

const PAGES = [
  "/",
  "/courses",
  "/courses/e2e-html",
  "/courses/e2e-html/first-tag",
  "/courses/e2e-html/query-preview",
  "/courses/e2e-html/next-steps",
  "/blog",
  "/login",
  "/me/learning"
];

async function watchViolations(page: Page): Promise<string[]> {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text()))
      violations.push(message.text());
  });
  await page.exposeFunction("__reportCsp", (text: string) => {
    violations.push(text);
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      const report = (
        window as unknown as { __reportCsp?: (text: string) => void }
      ).__reportCsp;
      report?.(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return violations;
}

test("pages carry the security headers", async ({ request }) => {
  const response = await request.get("/courses/e2e-html/first-tag");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'"
  );
  expect(headers["content-security-policy"]).not.toContain("paddle");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["permissions-policy"]).toContain("camera=()");
});

for (const path of PAGES) {
  test(`no policy violation on ${path}`, async ({ page }) => {
    const violations = await watchViolations(page);
    await page.goto(path);
    await page.getByRole("main").waitFor();
    // Let practice frames, the JavaScript sandbox and the SQL engine start.
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(3000);
    expect(violations).toEqual([]);
  });
}

test("the JavaScript practice runs under the policy", async ({ page }) => {
  const violations = await watchViolations(page);
  await page.goto("/courses/e2e-html/next-steps");
  const frame = page
    .locator('iframe[title^="Результат задания"]')
    .first()
    .contentFrame();
  // The sandbox ran the starting code and printed its console line.
  await expect(frame.getByText("› 0")).toBeVisible({ timeout: 15000 });
  expect(violations).toEqual([]);
});
