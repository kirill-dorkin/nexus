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
  const abilities = page.getByRole("region", { name: "Способности" });
  await expect(abilities.getByText("Каркас", { exact: true })).toBeVisible();
  // Branches fold: the current one (for a visitor, the first) is open, the others open on demand.
  const basics = page.locator("details", {
    has: page.locator("summary", { hasText: "Основы HTML" })
  });
  await expect(basics).toBeVisible();
  await expect(basics).not.toHaveAttribute("open");
  await basics.locator(":scope > summary").click();
  await expect(basics).toHaveAttribute("open");
  // The season-1 scene of a branch opens on demand and is plain text for screen readers.
  const start = page.locator("details", {
    has: page.locator("summary", { hasText: "Старт" })
  });
  await expect(start).toHaveAttribute("open");
  await start.getByText("Сцена", { exact: true }).click();
  await expect(
    start.getByText("Стой. По стройке без каски не ходят.")
  ).toBeVisible();

  const builtOn = page.getByRole("navigation", {
    name: "Стоит на персонажах"
  });
  await expect(
    builtOn.getByRole("link", { name: "Браузер", exact: true })
  ).toBeVisible();
  await expect(
    builtOn.getByRole("link", { name: "HTML", exact: true })
  ).toHaveCount(0);
  await expectAccessible(page);

  const missing = await page.goto("/characters/unknown");
  expect(missing?.status()).toBe(404);
});

test("a visitor opens the city map and goes to a district", async ({
  page
}) => {
  await page.goto("/map");
  await expect(
    page.getByRole("heading", { level: 1, name: "Карта города" })
  ).toBeVisible();
  const district = page.getByRole("link", {
    name: /Квартал Каркасов.*HTML · ур\. 0.*разрушен/
  });
  await expect(district).toBeVisible();
  await expectAccessible(page);
  await district.click();
  await expect(page).toHaveURL("/characters/html");
});

test("the roster announces upcoming characters", async ({ page }) => {
  await page.goto("/characters");
  const upcoming = page.getByRole("region", { name: "Скоро в городе" });
  await expect(upcoming.getByText("Angular", { exact: true })).toBeVisible();
  await expect(upcoming.getByText("Astro", { exact: true })).toBeVisible();
});
