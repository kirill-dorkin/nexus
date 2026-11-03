import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { expectAccessible } from "../a11y";
import { OWNER } from "../fixtures/accounts";

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/e2e-course.manifest.json"
);

test("an author creates, publishes and opens a course from Studio", async ({
  page,
  browser
}) => {
  const slug = `e2e-studio-${Date.now().toString(36)}`;
  const manifest = JSON.parse(readFileSync(fixture, "utf8")) as {
    course: { slug: string; title: string };
  };
  manifest.course = { ...manifest.course, slug, title: `Studio ${slug}` };

  await page.goto("/login?returnTo=%2Fstudio");
  await page.getByLabel("Электронная почта").fill(OWNER.email);
  await page.getByLabel("Пароль", { exact: true }).fill(OWNER.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL("/studio");
  await expect(
    page.getByRole("heading", { level: 1, name: "Studio" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Nexus" }).click();
  const workspace = page.getByRole("region", { name: "Курсы организации" });
  await expect(
    workspace.getByRole("link", { name: /E2E: HTML/ })
  ).toBeVisible();
  await expectAccessible(page);

  await workspace.getByRole("link", { name: "Создать курс" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Новый курс" })
  ).toBeVisible();
  await page.getByRole("button", { name: "JSON" }).click();
  await page
    .getByLabel("Manifest JSON")
    .fill(JSON.stringify(manifest, null, 2));
  await page.getByRole("button", { name: "Проверить документ" }).click();
  await expect(
    page.getByText("Проверка пройдена. Можно сохранить черновик.")
  ).toBeVisible();
  await page.getByRole("button", { name: "Сохранить черновик" }).click();

  await expect(page.getByText("Черновик · версия 1")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: manifest.course.title })
  ).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Предпросмотр" }).click();
  await page.getByRole("button", { name: "Опубликовать версию 1" }).click();
  await expect(
    page.getByRole("dialog", { name: "Зафиксировать версию 1?" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Подтвердить публикацию" }).click();
  await expect(page.getByText(/Версия опубликована/)).toBeVisible();

  await page.getByRole("link", { name: "← Все курсы" }).click();
  await page.getByRole("button", { name: "Nexus" }).click();
  const row = workspace
    .getByRole("listitem")
    .filter({ hasText: manifest.course.title });
  await row.getByRole("link", { name: "Доступ и ссылка" }).click();

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Доступ к опубликованному курсу"
    })
  ).toBeVisible();
  await page.getByRole("button", { name: "Создать приватный доступ" }).click();
  await expect(page.getByText(/Доступ создан приватным/)).toBeVisible();
  await page.getByRole("button", { name: "Открыть публичный доступ" }).click();
  await page
    .getByRole("button", { name: "Подтвердить открытие доступа" })
    .click();
  await expect(page.getByText("Публичный доступ включён.")).toBeVisible();
  await expectAccessible(page);

  const visitor = await browser.newPage();
  await visitor.goto(`/courses/${slug}`);
  await expect(
    visitor.getByRole("heading", { level: 1, name: manifest.course.title })
  ).toBeVisible();
  await visitor.close();
});
