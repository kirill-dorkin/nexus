import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("../../design-tokens/tokens.css", import.meta.url),
  "utf8"
);
function tokens(section: string) {
  return Object.fromEntries(
    [...section.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/gi)].map((match) => [
      match[1],
      match[2]
    ])
  );
}
const dark = tokens(css.split("/* A scoped")[0]!);
const light = { ...dark, ...tokens(css.split('[data-ui-theme="light"]')[1]!) };
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
describe.each([
  ["dark", dark],
  ["light", light]
] as const)("%s semantic contrast", (_, theme) => {
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
