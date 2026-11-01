import { describe, expect, it } from "vitest";
import { durationLabel, lessonCount } from "./learning-labels";

describe("learning labels", () => {
  it("formats durations for people", () => {
    expect(durationLabel(15)).toBe("15 мин");
    expect(durationLabel(120)).toBe("2 ч");
    expect(durationLabel(869)).toBe("14 ч 29 мин");
  });
  it("declines lesson counts", () => {
    expect(lessonCount(1)).toBe("1 урок");
    expect(lessonCount(2)).toBe("2 урока");
    expect(lessonCount(69)).toBe("69 уроков");
    expect(lessonCount(11)).toBe("11 уроков");
  });
});
