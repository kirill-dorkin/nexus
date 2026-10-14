import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import {
  appearanceBootScript,
  defaultAppearance,
  parseAppearance
} from "./preferences";

describe("device appearance preferences", () => {
  it("keeps safe defaults for corrupt storage and validates values independently", () => {
    expect(parseAppearance("{")).toEqual(defaultAppearance);
    expect(parseAppearance('"dark"')).toEqual(defaultAppearance);
    expect(parseAppearance('{"theme":"dark","accent":"unknown"}')).toEqual({
      theme: "dark",
      accent: "teal"
    });
    expect(parseAppearance('{"theme":"unknown","accent":"blue"}')).toEqual({
      theme: "system",
      accent: "blue"
    });
  });
  it("applies persisted preferences before paint without evaluating stored strings", () => {
    const root = { dataset: {} as Record<string, string> };
    runInNewContext(appearanceBootScript, {
      document: { documentElement: root },
      localStorage: { getItem: () => '{"theme":"light","accent":"blue"}' },
      matchMedia: () => ({ matches: true })
    });
    expect(root.dataset).toEqual({
      uiTheme: "light",
      uiAccent: "blue",
      themePreference: "light"
    });
  });
  it("honors the system color scheme when browser storage is unavailable", () => {
    for (const dark of [false, true]) {
      const root = { dataset: {} as Record<string, string> };
      runInNewContext(appearanceBootScript, {
        document: { documentElement: root },
        localStorage: {
          getItem: () => {
            throw new Error("SecurityError");
          }
        },
        matchMedia: () => ({ matches: dark })
      });
      expect(root.dataset.uiTheme).toBe(dark ? "dark" : "light");
      expect(root.dataset.uiAccent).toBe("teal");
    }
  });
});
