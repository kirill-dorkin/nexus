import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "../a11y";
import { OWNER, newLearner } from "../fixtures/accounts";

/*
 * Accessibility audit (web quality phase 8): axe on every route a visitor or
 * an author can reach, and the keyboard paths a sighted mouse user never
 * exercises. Screen-reader listening is a manual step recorded in
 * docs/design/accessibility-audit.md.
 */

const PUBLIC_ROUTES = [
  "/",
  "/courses",
  "/courses/e2e-html",
  "/courses/e2e-html/first-tag",
  "/courses/e2e-html/query-preview",
  "/courses/e2e-html/next-steps",
  "/blog",
  "/blog/kompyuternaya-gramotnost-s-nulya",
  "/login",
  "/login?mode=register",
  "/privacy",
  "/terms",
  "/me/learning",
  "/ui",
  "/no-such-page"
];

for (const route of PUBLIC_ROUTES) {
  test(`axe: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.getByRole("main").waitFor();
    await expectAccessible(page);
  });
}

// The course page as an enrolled learner: progress and «Навыки курса».
test("axe: /courses/e2e-html as an enrolled learner", async ({ page }) => {
  const learner = newLearner();
  await page.goto(
    `/login?returnTo=${encodeURIComponent("/courses/e2e-html")}&mode=register`
  );
  await page.getByLabel("Имя").fill(learner.name);
  await page.getByLabel("Электронная почта").fill(learner.email);
  await page.getByLabel("Пароль", { exact: true }).fill(learner.password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL("/courses/e2e-html");
  await page.getByRole("button", { name: "Начать курс" }).click();
  await expect(
    page.getByRole("region", { name: "Навыки курса" }).getByText("Теги")
  ).toBeVisible();
  await expectAccessible(page);
});

async function signInAsOwner(page: Page) {
  await page.goto("/login?returnTo=%2Fstudio");
  await page.getByLabel("Электронная почта").fill(OWNER.email);
  await page.getByLabel("Пароль", { exact: true }).fill(OWNER.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL("/studio");
}

test("axe: every Studio page of the e2e course", async ({ page }) => {
  await signInAsOwner(page);
  await page.getByRole("button", { name: /^Nexus/ }).click();
  const workspace = page.getByRole("region", { name: "Курсы организации" });
  await workspace.getByRole("link", { name: /E2E: HTML/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "E2E: HTML" })
  ).toBeVisible();
  await expectAccessible(page);
  for (const mode of ["JSON", "Предпросмотр"]) {
    await page.getByRole("button", { name: mode }).click();
    await expectAccessible(page);
  }

  await page.goto("/studio");
  await page.getByRole("button", { name: /^Nexus/ }).click();
  await workspace
    .getByRole("link", { name: "Вступление учеников · настройки организации" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectAccessible(page);
});

test.describe("keyboard", () => {
  test("the skip link is the first stop and moves focus to the content", async ({
    page
  }) => {
    await page.goto("/courses/e2e-html/first-tag");
    // On a slow runner a Tab pressed before hydration can be lost; React
    // marks the nodes it has hydrated.
    await page.waitForFunction(() => {
      const main = document.getElementById("learning-main");
      return (
        main !== null &&
        Object.keys(main).some((key) => key.startsWith("__reactFiber"))
      );
    });
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Перейти к содержимому" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("every interactive element shows a visible focus indicator", async ({
    page
  }) => {
    await page.goto("/courses/e2e-html/first-tag");
    const missing: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const report = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        // Focus inside a frame lives in the frame's own process; headless
        // Chromium then reports no :focus-within on the wrapper, although a
        // real browser draws the global frame ring there (globals.css). Check
        // that the wrapper is one the ring applies to.
        if (el.tagName === "IFRAME")
          return el.parentElement?.matches(":has(> iframe)") &&
            [...document.styleSheets].some((sheet) =>
              [...sheet.cssRules].some((rule) =>
                rule.cssText
                  .replace(/\s/g, "")
                  .includes(":has(>iframe)):focus-within")
              )
            )
            ? null
            : "iframe without the frame focus ring";
        // The indicator may be drawn on the element or on a wrapper around it
        // (the code editor rings its whole block while its textarea has focus).
        let node: HTMLElement | null = el;
        for (
          let depth = 0;
          node && depth < 3;
          depth++, node = node.parentElement
        ) {
          const style = getComputedStyle(node);
          if (
            (style.outlineStyle !== "none" &&
              parseFloat(style.outlineWidth) > 0) ||
            style.boxShadow !== "none"
          )
            return null;
        }
        return `${el.tagName.toLowerCase()} «${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}»`;
      });
      // The code editor keeps Tab for indentation; Escape lets the next Tab leave.
      if (
        await page.evaluate(
          () => document.activeElement?.tagName === "TEXTAREA"
        )
      )
        await page.keyboard.press("Escape");
      if (report) missing.push(report);
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  test("the practice editor indents with Tab and lets go after Escape", async ({
    page
  }) => {
    await page.goto("/courses/e2e-html/first-tag");
    const editor = page
      .getByRole("region", { name: "Задание: Первый заголовок" })
      .getByRole("textbox");
    await editor.focus();
    const before = await editor.inputValue();
    await page.keyboard.press("Tab");
    await expect(editor).toBeFocused();
    expect((await editor.inputValue()).length).toBe(before.length + 2);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    await expect(editor).not.toBeFocused();
  });

  test("the mobile course program opens as a modal and closes with Escape", async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/courses/e2e-html/first-tag");
    const open = page.getByRole("button", { name: /Программа \d+\/\d+/ });
    await open.focus();
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: "Программа курса" });
    await expect(sheet).toBeVisible();
    await expectAccessible(page);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("a quiz can be answered with the keyboard alone", async ({ page }) => {
    await page.goto("/courses/e2e-html/first-tag");
    const option = page.getByRole("radio", { name: "h1" });
    await option.focus();
    await page.keyboard.press("Space");
    await expect(option).toBeChecked();
    await page
      .getByRole("button", { name: "Проверить и сохранить ответ" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Ответ готов к проверке — осталось войти")
    ).toBeVisible();
  });
});
