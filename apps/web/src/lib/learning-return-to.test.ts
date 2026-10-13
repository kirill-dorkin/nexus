import { describe, it, expect } from "vitest";
import { safeLearningReturnTo } from "./learning-return-to";
describe("learning auth return target", () => {
  it.each([
    "/me/learning",
    "/studio",
    "/studio/11111111-1111-4111-8111-111111111111/new",
    "/studio/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222",
    "/learn/academy/course",
    "/learn/academy/course/lesson"
  ])("preserves %s", (v) => expect(safeLearningReturnTo(v)).toBe(v));
  it.each([
    "https://evil.test/learn/academy/course",
    "//evil.test",
    "/studio?returnTo=https://evil.test",
    "/studio/11111111-1111-4111-8111-111111111111/new?x=1",
    "/studio/caller/new",
    "/studio/11111111-1111-4111-8111-111111111111/../new",
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
