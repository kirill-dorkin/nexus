import { describe, expect, it } from "vitest";
import type { LearningOffering, LearningOfferingList } from "@platform/contracts";
import {
  appendOfferingPage,
  isShareableFreeOffering,
  publicOfferingUrl
} from "./offering-publication";

const VERSION = "019a1d10-9a11-7d10-8d11-911d991d1011";
function offering(id: string, version = VERSION): LearningOffering {
  return {
    id,
    organizationId: "019a1d10-9a11-7d10-8d11-911d991d1022",
    courseVersionId: version,
    slug: "computer-basics",
    name: "Компьютер с нуля",
    deliveryMode: "self_paced",
    accessMode: "membership",
    status: "open",
    visibility: "private",
    startsAt: null,
    endsAt: null
  };
}
const id1 = "019a1d10-9a11-7d10-8d11-911d991d1033";
const id2 = "019a1d10-9a11-7d10-8d11-911d991d1044";

describe("Studio free Offering publication helpers", () => {
  it("builds the learner's canonical public route without allowing URL manipulation", () => {
    expect(publicOfferingUrl("https://learn.example", "my-school", "computer-basics"))
      .toBe("https://learn.example/learn/my-school/computer-basics");
    for (const slug of ["../login", "a/b", "%2f", "?", ""]) {
      expect(() => publicOfferingUrl("https://learn.example", slug, "course")).toThrow();
      expect(() => publicOfferingUrl("https://learn.example", "my-school", slug)).toThrow();
    }
    expect(() => publicOfferingUrl("https://learn.example/path", "my-school", "course")).toThrow();
    expect(() => publicOfferingUrl("javascript:alert(1)", "my-school", "course")).toThrow();
  });

  it("does not offer a public link for private, closed, cohort or paid Offerings", () => {
    expect(isShareableFreeOffering(offering(id1))).toBe(false);
    expect(isShareableFreeOffering({ ...offering(id1), visibility: "public" })).toBe(true);
    expect(isShareableFreeOffering({ ...offering(id1), visibility: "public", status: "closed" })).toBe(false);
    expect(isShareableFreeOffering({ ...offering(id1), visibility: "public", accessMode: "entitlement_required" })).toBe(false);
    expect(isShareableFreeOffering({ ...offering(id1), visibility: "public", deliveryMode: "cohort" })).toBe(false);
  });

  it("accumulates cursor pages exactly once and rejects foreign releases", () => {
    const one: LearningOfferingList = { offerings: [offering(id1)], nextCursor: id1 };
    const two: LearningOfferingList = { offerings: [offering(id2)], nextCursor: null };
    const first = appendOfferingPage([], one, VERSION);
    expect(appendOfferingPage(first, two, VERSION).map((o) => o.id)).toEqual([id1, id2]);
    expect(() => appendOfferingPage(first, one, VERSION)).toThrow(/Duplicate/);
    expect(() => appendOfferingPage([], { offerings: [offering(id1, id2)], nextCursor: null }, VERSION))
      .toThrow(/different published release/);
    expect(() => appendOfferingPage([], { offerings: [offering(id1)], nextCursor: id2 }, VERSION))
      .toThrow(/cursor/);
  });
});
