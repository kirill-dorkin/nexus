import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(
  new URL("../../../../../packages/design-tokens/tokens.css", import.meta.url),
  "utf8"
);
const globalCss = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

function declarations(selector: string) {
  const normalized = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = tokens.match(new RegExp(`${normalized}\\s*\\{([^}]*)\\}`));
  expect(block, `Missing palette scope ${selector}`).not.toBeNull();
  return block![1]!;
}

function token(block: string, name: string) {
  const found = block.match(new RegExp(`${name}:\\s*([^;]+);`));
  expect(found, `Missing ${name}`).not.toBeNull();
  return found![1]!.trim();
}

function rgb(hex: string) {
  expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

function relativeLuminance(color: number[]) {
  const linear = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}

function ratio(first: number[], second: number[]) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("quiet accent-aware page canvas", () => {
  it("uses semantic canvas and glow tokens across the application", () => {
    expect(globalCss).toContain("var(--page-background)");
    expect(globalCss).toContain("var(--page-glow)");
    expect(globalCss).not.toContain("var(--accent-atmosphere)");
  });

  for (const theme of ["dark", "light"] as const) {
    const themeBlock = declarations(`[data-ui-theme="${theme}"]`);
    const canvas = token(themeBlock, "--page-background");
    const glow = token(themeBlock, "--page-glow");
    const match = canvas.match(
      /^color-mix\(in srgb, var\(--accent-action\) (\d+)%, (#[0-9a-f]{6})\)$/i
    );
    const glowMatch = glow.match(
      /^color-mix\(in srgb, var\(--accent-(?:action|night)\) (\d+)%, transparent\)$/i
    );
    it(`limits the ${theme} background color and glow to a subtle fraction`, () => {
      expect(match).not.toBeNull();
      expect(glowMatch).not.toBeNull();
      const strength = Number(match![1]);
      expect(strength).toBeGreaterThan(0);
      expect(strength).toBeLessThanOrEqual(theme === "dark" ? 9 : 5);
      expect(Number(glowMatch![1])).toBeLessThanOrEqual(theme === "dark" ? 8 : 6);
    });
    for (const accent of ["rose", "violet", "blue", "teal", "amber", "lime"]) {
      it(`preserves readable ${theme} text on the ${accent} canvas`, () => {
        expect(match).not.toBeNull();
        const accentBlock = declarations(`[data-ui-accent="${accent}"]`);
        const action = rgb(token(accentBlock, "--accent-action"));
        const neutral = rgb(match![2]!);
        const weight = Number(match![1]) / 100;
        const canvasRgb = neutral.map((channel, i) =>
          (1 - weight) * channel + weight * action[i]!
        );
        for (const foreground of ["--text-primary", "--text-secondary"]) {
          const textRgb = rgb(token(themeBlock, foreground));
          expect(ratio(textRgb, canvasRgb), `${theme}/${accent}: ${foreground}`).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }
});
