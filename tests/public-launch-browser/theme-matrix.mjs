import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const themes = ["dark", "light"];
const accents = ["rose", "violet", "blue", "teal", "amber"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Exercise actual production Chrome CSS, not merely parsed token strings.
 * Only anonymous public content may enter the screenshot artifact.
 */
export async function verifyPublicThemeMatrix(cdp, { navigate, evaluate, waitForExpression, origin }) {
  console.log("[browser-launch] rendered theme/accent matrix and anonymous visual evidence");
  const output = process.env.PUBLIC_LAUNCH_THEME_SCREENSHOT_DIR;
  if (output) mkdirSync(output, { recursive: true });

  for (const page of [
    { slug: "home", url: origin, ready: 'document.body.innerText.includes("Основы компьютера")' },
    { slug: "product", url: origin + "/catalog/acme/products/course", ready: 'document.body.innerText.includes("Production TypeScript")' }
  ]) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true
    });
    await navigate(cdp, page.url);
    await waitForExpression(cdp, page.ready, "theme matrix " + page.slug);
    const script = "(" + (() => {
      const root = document.documentElement;
      const previous = { theme: root.dataset.uiTheme, accent: root.dataset.uiAccent };
      const probe = document.createElement("span");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText =
        "position:fixed;left:-9999px;background:var(--surface-elevated);color:var(--text-primary);border:1px solid var(--border-default)";
      document.body.append(probe);
      const output = [];
      for (const theme of ["dark", "light"]) {
        for (const accent of ["rose", "violet", "blue", "teal", "amber"]) {
          root.dataset.uiTheme = theme;
          root.dataset.uiAccent = accent;
          const computed = getComputedStyle(probe);
          output.push({
            theme, accent,
            surface: computed.backgroundColor,
            text: computed.color,
            border: computed.borderTopColor,
            overflow: document.documentElement.scrollWidth > innerWidth
          });
        }
      }
      probe.remove();
      if (previous.theme === undefined) delete root.dataset.uiTheme;
      else root.dataset.uiTheme = previous.theme;
      if (previous.accent === undefined) delete root.dataset.uiAccent;
      else root.dataset.uiAccent = previous.accent;
      return output;
    }).toString() + ")()";
    const result = await evaluate(cdp, script);
    assert(result.length === 10, page.slug + ": missing theme/accent pairs");
    for (const item of result) {
      assert(item.surface && item.surface !== "rgba(0, 0, 0, 0)",
        page.slug + ": transparent elevated surface for " + item.theme + "/" + item.accent);
      assert(item.text && item.border, page.slug + ": unresolved semantic color");
      assert(!item.overflow, page.slug + ": overflow on 390px for " + item.theme + "/" + item.accent);
    }
    for (const theme of themes) {
      const variants = result.filter((item) => item.theme === theme);
      assert(new Set(variants.map((item) => item.surface)).size >= 3,
        page.slug + ": selected accent does not affect elevated surface in " + theme);
      assert(new Set(variants.map((item) => item.border)).size >= 3,
        page.slug + ": selected accent does not affect borders in " + theme);
    }
    for (const accent of accents) {
      const [dark, light] = themes.map((theme) =>
        result.find((item) => item.theme === theme && item.accent === accent)
      );
      assert(dark.surface !== light.surface && dark.text !== light.text,
        page.slug + ": light/dark theme not reflected in rendered colors for " + accent);
    }

    if (output) {
      for (const viewport of [
        { width: 390, height: 844, mobile: true },
        { width: 1440, height: 900, mobile: false }
      ]) {
        await cdp.send("Emulation.setDeviceMetricsOverride", {
          ...viewport, deviceScaleFactor: 1
        });
        for (const [theme, accent] of [["dark", "teal"], ["light", "amber"]]) {
          const update = "(function(theme,accent){document.documentElement.dataset.uiTheme=theme;document.documentElement.dataset.uiAccent=accent;return document.documentElement.scrollWidth<=innerWidth;})(" +
            JSON.stringify(theme) + "," + JSON.stringify(accent) + ")";
          const safeWidth = await evaluate(cdp, update);
          assert(safeWidth, page.slug + ": screenshot viewport overflows " + viewport.width);
          const image = await cdp.send("Page.captureScreenshot", {
            format: "png", fromSurface: true, captureBeyondViewport: false
          });
          assert(typeof image.data === "string" && image.data.length > 100,
            page.slug + ": Chrome returned no screenshot");
          const fileName = [page.slug, String(viewport.width), theme, accent].join("-") + ".png";
          writeFileSync(join(output, fileName), Buffer.from(image.data, "base64"));
        }
      }
    }
  }
  console.log("[browser-launch] 2 anonymous routes × 10 rendered theme/accent pairs passed");
}
