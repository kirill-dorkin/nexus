import { expect, test } from "@playwright/test";

test("a page error and the page's Web Vitals reach the API without private details", async ({
  page
}) => {
  await page.goto("/courses/e2e-html/first-tag");
  await page.getByRole("main").waitFor();
  await page.evaluate(() => {
    setTimeout(() => {
      throw new TypeError("e2e private detail");
    });
  });

  // The reporter sends its batch a few seconds later.
  const reported = page.waitForRequest(
    (request) =>
      request.url().endsWith("/v1/telemetry/web") &&
      (request.postData() ?? "").includes("client_error"),
    { timeout: 15_000 }
  );
  const request = await reported;
  const response = await request.response();

  expect(response?.status()).toBe(204);
  const body = request.postData() ?? "";
  expect(body).not.toContain("e2e private detail");
  expect(body).not.toContain("first-tag");
  expect(JSON.parse(body)).toMatchObject({
    events: expect.arrayContaining([
      {
        type: "client_error",
        kind: "error",
        errorName: "TypeError",
        source: "app",
        route: "/courses/[course]/[lesson]"
      }
    ])
  });
});
