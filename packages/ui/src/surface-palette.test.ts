import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(
  new URL("../../design-tokens/tokens.css", import.meta.url),
  "utf8"
);
const uiCss = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function scope(theme: "dark" | "light") {
  const found = tokens.match(
    new RegExp(`\\[data-ui-theme="${theme}"\\]\\s*\\{([^}]*)\\}`)
  );
  expect(found, `Missing ${theme} palette scope`).not.toBeNull();
  return found![1]!;
}

function value(block: string, name: string) {
  const found = block.match(new RegExp(`${name}:\\s*([^;]+);`));
  expect(found, `Missing ${name}`).not.toBeNull();
  return found![1]!.trim();
}

function channels(hex: string): number[] {
  expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

function expectNeutral(hex: string, context: string) {
  const rgb = channels(hex);
  // Neutral slate/graphite may have restrained cool undertones; never encode a
  // strong purple or independently colored accent into every base surface.
  expect(Math.max(...rgb) - Math.min(...rgb), context).toBeLessThanOrEqual(24);
}

describe.each(["dark", "light"] as const)(
  "%s hue-neutral semantic surface contract",
  (theme) => {
    const colors = scope(theme);
    it("keeps core backgrounds neutral regardless of chosen accent", () => {
      for (const name of [
        "--surface-default",
        "--surface-subtle",
        "--surface-solid",
        "--surface-input"
      ]) {
        expectNeutral(value(colors, name), `${theme} ${name}`);
      }
    });

    it("derives elevation/hover from a neutral base and the selected accent", () => {
      for (const name of ["--surface-elevated", "--surface-hover"]) {
        const expression = value(colors, name);
        if (expression.startsWith("#")) {
          expectNeutral(expression, `${theme} ${name}`);
          continue;
        }
        const mix = expression.match(
          /^color-mix\\(in srgb, var\\(--accent-action\\) (\\d+)%, (#[0-9a-f]{6})\\)$/i
        );
        expect(mix, `${theme} ${name}: expected semantic color-mix`).not.toBeNull();
        expect(Number(mix![1])).toBeLessThanOrEqual(12);
        expectNeutral(mix![2]!, `${theme} ${name} neutral base`);
      }
    });

    it("does not use a plum hue underneath selected accents", () => {
      const boundary = value(colors, "--border-default");
      const match = boundary.match(
        /^color-mix\\(in srgb, var\\(--accent-action\\) (\\d+)%, (#[0-9a-f]{6})\\)$/i
      );
      expect(match).not.toBeNull();
      expect(Number(match![1])).toBeLessThanOrEqual(12);
      expectNeutral(match![2]!, `${theme} border base`);
    });
  }
);

it("uses the active theme text token for the shared dialog scrim", () => {
  expect(uiCss).toContain(
    "background: color-mix(in srgb, var(--text-primary) 28%, transparent);"
  );
  expect(uiCss).not.toContain("rgb(10 6 16 / 35%)");
});
