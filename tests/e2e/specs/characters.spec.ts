import { expect, test } from "@playwright/test";

import { expectAccessible } from "../a11y";

// ADR-0074: the character roster and a character profile render from the skill map for anyone;
// without confirmations every character is at level 0 and the first branch is open.

test("a visitor browses the characters and a character's skill tree", async ({
  page
}) => {
  await page.goto("/characters");
  await expect(
    page.getByRole("heading", { level: 1, name: "Персонажи" })
  ).toBeVisible();
  for (const name of ["ПК", "Браузер", "HTML", "CSS", "JavaScript", "SQL"])
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "HTML: уровень 0 из 100" })
  ).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("link", { name: "HTML", exact: true }).click();
  await expect(page).toHaveURL("/characters/html");
  await expect(
    page.getByRole("heading", { level: 1, name: "HTML" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Навыки" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Основы HTML" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Создайте аккаунт" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Браузер", exact: true })
  ).toBeVisible();
  await expectAccessible(page);

  const missing = await page.goto("/characters/unknown");
  expect(missing?.status()).toBe(404);
});
