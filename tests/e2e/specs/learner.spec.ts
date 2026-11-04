import { expect, test } from "@playwright/test";

import { expectAccessible } from "../a11y";
import { newLearner } from "../fixtures/accounts";

const course = "/courses/e2e-html";
const lesson = `${course}/first-tag`;

test("an anonymous visitor finds the course and practices without an account", async ({
  page
}) => {
  await page.goto("/");
  await expectAccessible(page);
  // Other suites may publish courses into the same database, so the course is
  // found by its title in the catalog rather than as "the first course".
  await page.goto("/courses");
  await expectAccessible(page);
  await page
    .getByRole("link", { name: /E2E: HTML/ })
    .first()
    .click();

  await expect(page).toHaveURL(course);
  await expect(
    page.getByRole("heading", { level: 1, name: "E2E: HTML" })
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("link", { name: "Открыть первый урок" }).click();

  await expect(page).toHaveURL(lesson);
  await expect(
    page.getByRole("heading", { level: 1, name: "Первый тег" })
  ).toBeVisible();
  await expectAccessible(page);

  const challenge = page.getByRole("region", {
    name: "Задание: Первый заголовок"
  });
  await challenge.getByRole("textbox").fill("<h1>Привет</h1>");
  await expect(challenge.getByText("— выполнено")).toHaveCount(2);
  await expect(challenge.getByRole("status")).toContainText("Готово!");

  await page.getByRole("radio", { name: "h1" }).check();
  await page
    .getByRole("button", { name: "Проверить и сохранить ответ" })
    .click();
  await expect(
    page.getByText("Ответ готов к проверке — осталось войти")
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Создать аккаунт" })
  ).toHaveAttribute(
    "href",
    `/login?returnTo=${encodeURIComponent(lesson)}&mode=register`
  );
});

test.describe.serial("a registered learner", () => {
  const learner = newLearner();

  test("registers from the quiz, is enrolled by the answer and sees progress", async ({
    page
  }) => {
    await page.goto(lesson);
    await page.getByRole("radio", { name: "h1" }).check();
    await page
      .getByRole("button", { name: "Проверить и сохранить ответ" })
      .click();
    await page.getByRole("link", { name: "Создать аккаунт" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Начнём обучение." })
    ).toBeVisible();
    await expectAccessible(page);
    await page.getByLabel("Имя").fill(learner.name);
    await page.getByLabel("Электронная почта").fill(learner.email);
    await page.getByLabel("Пароль", { exact: true }).fill(learner.password);
    await page.getByRole("checkbox", { name: /условия использования/ }).check();
    await page
      .getByRole("checkbox", { name: /обработку персональных данных/ })
      .check();
    await page.getByRole("button", { name: "Создать аккаунт" }).click();

    await expect(page).toHaveURL(lesson);
    await page.getByRole("radio", { name: "h1" }).check();
    await page
      .getByRole("button", { name: "Проверить и сохранить ответ" })
      .click();
    await expect(page.getByText("Правильно")).toBeVisible();
    await expect(
      page.getByText("Попытка 1. Результат сохранён.")
    ).toBeVisible();

    await page.goto("/me/learning");
    await expect(
      page.getByRole("heading", { name: "E2E: HTML" })
    ).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "Задания курса: 1 из 1" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Вернуться к материалам/ })
    ).toBeVisible();
    await expectAccessible(page);
  });

  test("signs out and back in to the same progress", async ({ page }) => {
    await page.goto("/login?returnTo=%2Fme%2Flearning");
    await page.getByLabel("Электронная почта").fill(learner.email);
    await page.getByLabel("Пароль", { exact: true }).fill(learner.password);
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page).toHaveURL("/me/learning");
    await expect(
      page.getByRole("progressbar", { name: "Задания курса: 1 из 1" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Выйти" }).click();
    await expect(
      page.getByText("Войдите, чтобы увидеть свои курсы.")
    ).toBeVisible();
  });
});
