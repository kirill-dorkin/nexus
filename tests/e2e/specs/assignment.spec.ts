import { expect, test } from "@playwright/test";

import { expectAccessible } from "../a11y";
import { newLearner } from "../fixtures/accounts";

// ADR-0073: a learner downloads a file assignment, uploads the work and sees
// what to fix; a correct try is accepted. Runs against the real API.

const lesson = "/courses/e2e-html/next-steps";

test("a learner downloads, uploads and fixes a file assignment", async ({
  page
}) => {
  const learner = newLearner();
  await page.goto(
    `/login?returnTo=${encodeURIComponent(lesson)}&mode=register`
  );
  await page.getByLabel("Имя").fill(learner.name);
  await page.getByLabel("Электронная почта").fill(learner.email);
  await page.getByLabel("Пароль", { exact: true }).fill(learner.password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL(lesson);

  await expect(page.getByText("Заголовок красный")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать заготовку" }).click();
  expect((await download).suggestedFilename()).toBe("files-page.zip");

  const input = page.getByLabel(/Выберите zip-архив/);
  await input.setInputFiles([
    {
      name: "index.html",
      mimeType: "text/html",
      buffer: Buffer.from("<h1>Привет</h1>")
    },
    {
      name: "style.css",
      mimeType: "text/css",
      buffer: Buffer.from("h1 { color: blue; }")
    }
  ]);
  await page.getByRole("button", { name: "Отправить на проверку" }).click();
  const report = page.getByRole("region", { name: "Результат проверки" });
  await expect(report).toContainText("Пройдено проверок: 1 из 2");
  await expect(report).toContainText("Задайте цвет заголовка в style.css.");
  await expectAccessible(page);

  await input.setInputFiles([
    {
      name: "index.html",
      mimeType: "text/html",
      buffer: Buffer.from("<h1>Привет</h1>")
    },
    {
      name: "style.css",
      mimeType: "text/css",
      buffer: Buffer.from("h1 { color: red; }")
    }
  ]);
  await page.getByRole("button", { name: "Отправить на проверку" }).click();
  await expect(report).toContainText("Задание выполнено");
  await expect(report).toContainText("Попытка 2. Результат сохранён.");
});
