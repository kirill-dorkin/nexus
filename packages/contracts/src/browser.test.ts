import { describe, expect, it } from "vitest";

import { globalConfig } from "zod/v4/core";

import { isResourceSlug, isUuid, parseWithoutEvalInBrowser } from "./browser";
import { resourceSlugSchema, uuidSchema } from "./common";

describe("browser identifier checks agree with the contracts", () => {
  it.each([
    "0194f6c2-1b2c-7d3e-8f40-123456789abc",
    "0194F6C2-1B2C-7D3E-8F40-123456789ABC",
    "00000000-0000-0000-0000-000000000000",
    "0194f6c2-1b2c-9d3e-8f40-123456789abc",
    "0194f6c2-1b2c-7d3e-7f40-123456789abc",
    "not-a-uuid",
    ""
  ])("uuid %s", (value) => {
    expect(isUuid(value)).toBe(uuidSchema.safeParse(value).success);
  });

  it.each([
    "html",
    "ab",
    "a",
    "first-tag",
    "First",
    "a--b",
    "-a",
    "a".repeat(63),
    "a".repeat(64)
  ])("slug %s", (value) => {
    expect(isResourceSlug(value)).toBe(
      resourceSlugSchema.safeParse(value).success
    );
  });
});

describe("parseWithoutEvalInBrowser", () => {
  it("turns on zod's jitless mode through zod's own global settings", () => {
    const g = globalThis as { window?: unknown };
    const hadWindow = "window" in g;
    g.window = {};
    try {
      parseWithoutEvalInBrowser();
      expect(globalConfig.jitless).toBe(true);
    } finally {
      if (!hadWindow) delete g.window;
      globalConfig.jitless = undefined;
    }
  });
});
