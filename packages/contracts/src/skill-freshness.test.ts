import { describe, expect, it } from "vitest";

import { isActive, skillFreshness } from "./skill-freshness";

describe("skill freshness (skill-freshness@1)", () => {
  it("is unconfirmed without passing Evidence", () => {
    expect(skillFreshness([], "2026-11-05")).toEqual({
      state: "unconfirmed",
      step: 0,
      dueOn: null,
      forgottenAfter: null
    });
  });

  it("keeps a first confirmation for 3 days, fades for 7 more, then forgets", () => {
    const days = ["2026-11-01"];
    expect(skillFreshness(days, "2026-11-04")).toMatchObject({
      state: "confirmed",
      step: 1,
      dueOn: "2026-11-04",
      forgottenAfter: "2026-11-11"
    });
    expect(skillFreshness(days, "2026-11-05").state).toBe("fading");
    expect(skillFreshness(days, "2026-11-11").state).toBe("fading");
    expect(skillFreshness(days, "2026-11-12").state).toBe("forgotten");
  });

  it("grows the term with spaced confirmations: 3 → 7 → 21 → 60 → 180 → 365 days", () => {
    const days = [
      "2026-01-01",
      "2026-01-04",
      "2026-01-11",
      "2026-02-01",
      "2026-04-02",
      "2026-09-29",
      "2027-09-29"
    ];
    const state = skillFreshness(days, "2027-10-01");
    expect(state.step).toBe(6);
    expect(state.dueOn).toBe("2028-09-28");
  });

  it("does not step up for an early repeat, only restarts the term", () => {
    const state = skillFreshness(["2026-11-01", "2026-11-02"], "2026-11-02");
    expect(state.step).toBe(1);
    expect(state.dueOn).toBe("2026-11-05");
  });

  it("steps up in the second half of the term and during grace", () => {
    expect(
      skillFreshness(["2026-11-01", "2026-11-03"], "2026-11-03").step
    ).toBe(2);
    expect(
      skillFreshness(["2026-11-01", "2026-11-10"], "2026-11-10").step
    ).toBe(2);
  });

  it("steps down when a forgotten skill is confirmed again", () => {
    const days = ["2026-01-01", "2026-01-04", "2026-01-11", "2026-03-01"];
    // Step 3 (21 days from 01-11 → due 02-01, forgotten after 02-08), relearned on 03-01.
    expect(skillFreshness(days, "2026-03-01")).toMatchObject({
      state: "confirmed",
      step: 2,
      dueOn: "2026-03-08"
    });
  });

  it("ignores duplicate and unordered days", () => {
    expect(
      skillFreshness(["2026-11-04", "2026-11-01", "2026-11-01"], "2026-11-04")
        .step
    ).toBe(2);
  });

  it("counts confirmed and fading skills as active", () => {
    expect(isActive("confirmed")).toBe(true);
    expect(isActive("fading")).toBe(true);
    expect(isActive("forgotten")).toBe(false);
    expect(isActive("unconfirmed")).toBe(false);
  });
});
