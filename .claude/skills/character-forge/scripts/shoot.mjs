// Screenshots a character page at levels 0, 30, 50, 70 and 100 (one per rank window),
// so the ranks can be compared side by side before anything is shown to the owner.
//
// Usage, from the repository root (needs @playwright/test from the workspace and a local
// Google Chrome; Playwright's own browsers are not downloaded in this repo):
//   cp .claude/skills/character-forge/scripts/shoot.mjs tests/shoot-tmp.mjs
//   node tests/shoot-tmp.mjs /abs/path/character.html /abs/out/dir [width] [height]
//   rm tests/shoot-tmp.mjs
// The copy into tests/ is only so Node resolves @playwright/test from the workspace.
//
// The page must have an <input type="range" id="level"> that drives the character and a
// #scene element that holds the canvas (the template has both).
import { chromium } from "@playwright/test";

const [, , file, out, width = "900", height = "700"] = process.argv;
if (!file || !out) {
  console.error(
    "Usage: node shoot.mjs <character.html> <out-dir> [width] [height]"
  );
  process.exit(1);
}
const browser = await chromium.launch({
  channel: "chrome",
  // Software WebGL works headless on any Mac; colours are close to a real GPU, glow a bit flatter.
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});
const page = await browser.newPage({
  viewport: { width: +width, height: +height }
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(file.startsWith("http") ? file : "file://" + file);
await page.waitForTimeout(2500);
for (const level of [0, 30, 50, 70, 100]) {
  await page.evaluate((v) => {
    const range = document.getElementById("level");
    range.value = String(v);
    range.dispatchEvent(new Event("input"));
  }, level);
  // The look eases towards the target level; wait until it has settled.
  await page.waitForTimeout(2200);
  await page.locator("#scene").screenshot({ path: `${out}/lvl${level}.png` });
}
await browser.close();
if (errors.length) {
  console.error("Page errors:\n" + errors.join("\n"));
  process.exit(2);
}
console.log(`Saved lvl0, lvl30, lvl50, lvl70, lvl100 to ${out}`);
