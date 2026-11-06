import { describe, expect, it } from "vitest";

import type { BranchProgress } from "../../lib/skill-map/skill-map";
import { nextLook } from "./character-profile";
import { currentBranchId } from "./character-skill-tree";

const branch = (id: string, unlocked: boolean, active: number, total: number) =>
  ({
    branch: { id },
    unlocked,
    active,
    skills: Array.from({ length: total }, () => ({})),
    waitsFor: []
  }) as unknown as BranchProgress;

describe("character hero", () => {
  it("counts the levels left to the next look", () => {
    expect(nextLook({ level: 0, maxLevel: 100 })).toEqual({
      title: "Ученик",
      levels: 20
    });
    expect(nextLook({ level: 45, maxLevel: 100 })).toEqual({
      title: "Мастер",
      levels: 15
    });
    expect(nextLook({ level: 85, maxLevel: 100 })).toBeNull();
  });

  it("opens the first unfinished open branch, else the first one", () => {
    expect(
      currentBranchId([
        branch("a", true, 3, 3),
        branch("b", true, 1, 4),
        branch("c", false, 0, 2)
      ])
    ).toBe("b");
    expect(
      currentBranchId([branch("a", false, 0, 2), branch("b", false, 0, 2)])
    ).toBe("a");
    expect(currentBranchId([])).toBeNull();
  });
});
