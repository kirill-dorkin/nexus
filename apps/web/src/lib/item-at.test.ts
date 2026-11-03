import { describe, expect, it } from "vitest";

import { itemAt } from "./item-at";

describe("itemAt", () => {
  it("returns the element at an index inside the list", () => {
    expect(itemAt(["a", "b"], 1)).toBe("b");
    expect(itemAt("ab", 0)).toBe("a");
  });

  it("throws a RangeError outside the list instead of returning undefined", () => {
    expect(() => itemAt(["a"], 1)).toThrow(RangeError);
    expect(() => itemAt([], 0)).toThrow("Index 0 is outside a list of 0.");
  });
});
