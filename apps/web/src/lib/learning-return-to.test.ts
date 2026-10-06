import { describe, it, expect } from "vitest";
import { safeLearningReturnTo } from "./learning-return-to";
describe("learning auth return target", () => {
  it.each([
    "/me/learning",
    "/learn/academy/course",
    "/learn/academy/course/lesson"
  ])("preserves %s", (v) => expect(safeLearningReturnTo(v)).toBe(v));
  it.each([
    "https://evil.test/learn/academy/course",
    "//evil.test",
    "/\\evil.test",
    "/learn/aa/bb?next=https://evil.test",
    "/learn/aa/bb#x",
    "/learn/aa/%2F%2Fevil",
    "/learn/aa/../bb",
    "/learn/aa/bb/",
    "/learn/aa/bb\n",
    "/catalog/aa/products/bb",
    undefined,
    ["/learn/aa/bb"]
  ])("rejects unsafe or unrelated target %s", (v) =>
    expect(safeLearningReturnTo(v)).toBe("/me/learning")
  );
});
