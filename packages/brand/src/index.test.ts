import { describe, expect, it } from "vitest";

import { brand } from "./index";

describe("brand configuration", () => {
  it("is immutable at runtime", () => {
    expect(Object.isFrozen(brand)).toBe(true);
  });

  it("contains a valid brand identity without imposing it on architecture namespaces", () => {
    expect(brand.name.trim().length).toBeGreaterThan(0);
    expect(brand.shortName.trim().length).toBeGreaterThan(0);
    expect(brand.tagline.trim().length).toBeGreaterThan(0);
    expect(brand.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});
