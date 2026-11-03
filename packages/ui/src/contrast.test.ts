import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("../../design-tokens/tokens.css", import.meta.url),
  "utf8"
);
// Resolve the public token contract, including aliases and accent scopes.
// Do not rely on prose comments or a particular ordering of palette rules.
const rules = [
  ...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)
].map((match) => ({
  selectors: match[1]!.split(",").map((selector) => selector.trim()),
  values: Object.fromEntries(
    [...match[2]!.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((value) => [
      value[1]!,
      value[2]!.trim()
    ])
  )
}));
function palette(mode: string, accent: string) {
  const values: Record<string, string> = {};
  for (const selector of [
    ":root",
    `[data-ui-theme="${mode}"]`,
    `[data-ui-accent="${accent}"]`
  ]) {
    for (const rule of rules)
      if (rule.selectors.includes(selector)) Object.assign(values, rule.values);
  }
  function resolve(name: string): string {
    const value = values[name];
    if (!value) throw new Error(`Missing semantic token ${name}`);
    const alias = /^var\((--[\w-]+)\)$/.exec(value);
    if (alias) return resolve(alias[1]!);
    if (/^#[0-9a-f]{3}$/i.test(value))
      return "#" + value.slice(1).replace(/./g, (char) => char + char);
    return value;
  }
  return Object.fromEntries(
    Object.keys(values).map((name) => [name, resolve(name)])
  );
}
function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    );
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(first: string, second: string) {
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
describe.each(
  ["dark", "light"].flatMap((mode) =>
    ["rose", "violet", "blue", "teal", "amber", "lime"].map(
      (accent) => [mode, accent, palette(mode, accent)] as const
    )
  )
)("%s / %s semantic contrast", (_, _accent, theme) => {
  it("keeps normal text and action labels at WCAG AA on named solid surfaces", () => {
    for (const background of [
      "--surface-default",
      "--surface-solid",
      "--surface-input",
      "--surface-subtle"
    ]) {
      for (const foreground of [
        "--text-primary",
        "--text-secondary",
        "--text-accent",
        "--status-success",
        "--status-warning",
        "--status-danger"
      ]) {
        expect(
          contrast(theme[foreground]!, theme[background]!),
          `${foreground} on ${background}`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(
      contrast(theme["--text-on-action"]!, theme["--action-primary"]!)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(theme["--text-on-action"]!, theme["--action-danger"]!)
    ).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps input boundaries and focus visible", () => {
    expect(
      contrast(theme["--border-strong"]!, theme["--surface-input"]!)
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrast(theme["--focus-ring"]!, theme["--surface-default"]!)
    ).toBeGreaterThanOrEqual(3);
  });
});
