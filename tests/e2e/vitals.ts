import type { Page } from "@playwright/test";

export type PageCost = {
  /** Compressed bytes of JavaScript the page downloaded. */
  scriptBytes: number;
  /** Largest Contentful Paint, ms after navigation start. */
  lcp: number;
  /** Cumulative Layout Shift without shifts right after input. */
  cls: number;
  /** URLs of resources that only SQL practice should load. */
  sqlRuntime: string[];
};

/** Loads `path` in a fresh page and measures what it cost the visitor. */
export async function measure(
  page: Page,
  path: string,
  { scrollToEnd = false }: { scrollToEnd?: boolean } = {}
): Promise<PageCost> {
  // Requests of dedicated workers (the SQL engine runs in one) are seen here,
  // not in the page's own resource timeline.
  const requested: string[] = [];
  page.context().on("request", (request) => requested.push(request.url()));
  // Next prefetches the code of every route linked in the viewport. That is
  // the cost of the next navigation, not of this page, and it depends on
  // which courses the database holds, so prefetches are cut off here.
  await page.route("**/*", (route) =>
    route.request().headers()["next-router-prefetch"]
      ? route.abort()
      : route.continue()
  );
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number; __lcp: number };
    w.__cls = 0;
    w.__lcp = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[])
        if (!entry.hadRecentInput) w.__cls += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last) w.__lcp = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(path, { waitUntil: "load" });
  // While a page streams, the hidden loading fallback is a second <main>.
  await page.getByRole("main").waitFor();
  if (scrollToEnd) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }
  // Let late chunks, fonts and layout settle before reading the totals.
  await page.waitForTimeout(scrollToEnd ? 4000 : 1500);
  const cost = await page.evaluate(() => {
    const w = window as unknown as { __cls: number; __lcp: number };
    const resources = performance.getEntriesByType(
      "resource"
    ) as PerformanceResourceTiming[];
    return {
      scriptBytes: resources
        .filter(
          (r) => r.initiatorType === "script" || /\.js(\?|$)/.test(r.name)
        )
        .reduce((sum, r) => sum + r.encodedBodySize, 0),
      lcp: Math.round(w.__lcp),
      cls: Number(w.__cls.toFixed(4))
    };
  });
  return {
    ...cost,
    sqlRuntime: requested.filter((url) =>
      /pglite|\.wasm(\?|$)|\.data(\?|$)/i.test(url)
    )
  };
}
