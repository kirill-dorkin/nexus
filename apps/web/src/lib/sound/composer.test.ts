import { describe, expect, it } from "vitest";
import {
  BAR_STEPS,
  MELODY_SCALE,
  PROGRESSIONS,
  SECTION_BARS,
  composeBar,
  progressionOf,
  sectionOf,
  stepTime,
  sixteenth
} from "./composer";
import { nextBarAfter, RESUME_DELAY } from "./timeline";
import { volumeGain } from "./engine";

const bars = (seed: number, count: number) =>
  Array.from({ length: count }, (_, i) => composeBar(i, seed));

describe("lo-fi composer", () => {
  it("is deterministic for a seed and varies between seeds", () => {
    expect(composeBar(21, 7)).toEqual(composeBar(21, 7));
    expect(JSON.stringify(bars(7, 40))).not.toBe(JSON.stringify(bars(8, 40)));
  });

  it("opens with a drumless intro, then cycles groove, lift, groove, breakdown", () => {
    expect([0, 8, 16, 24, 32, 40].map((bar) => sectionOf(bar).kind)).toEqual([
      "intro",
      "groove",
      "lift",
      "groove",
      "breakdown",
      "groove"
    ]);
    const intro = bars(3, SECTION_BARS);
    expect(
      intro
        .flatMap((b) => b.events)
        .some(
          (e) =>
            e.voice === "kick" || e.voice === "snare" || e.voice === "melody"
        )
    ).toBe(false);
    const groove = composeBar(SECTION_BARS, 3);
    expect(
      groove.events.filter((e) => e.voice === "kick").length
    ).toBeGreaterThanOrEqual(2);
    expect(
      groove.events
        .filter((e) => e.voice === "snare")
        .map((e) => Math.round(e.step))
    ).toEqual(expect.arrayContaining([4, 12]));
  });

  it("never repeats a progression in consecutive sections", () => {
    for (const seed of [1, 2, 3, 99]) {
      const picks = Array.from({ length: 30 }, (_, s) =>
        progressionOf(s, seed)
      );
      for (let i = 1; i < picks.length; i++)
        expect(picks[i]).not.toBe(picks[i - 1]);
      expect(new Set(picks).size).toBe(PROGRESSIONS.length);
    }
  });

  it("keeps every note in range, inside the bar and in key", () => {
    for (const bar of bars(42, 120)) {
      for (const event of bar.events) {
        expect(event.step).toBeGreaterThanOrEqual(-0.1);
        expect(event.step).toBeLessThan(BAR_STEPS);
        expect(event.velocity).toBeGreaterThan(0);
        expect(event.velocity).toBeLessThanOrEqual(1.1);
        if (event.voice === "melody")
          expect(MELODY_SCALE).toContain(event.midi);
        if (event.voice === "keys")
          expect(bar.chord.voicing).toContain(event.midi);
        if (event.voice === "bass")
          expect(event.midi!).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it("swings the off-beat sixteenths and keeps the beats straight", () => {
    expect(stepTime(4)).toBeCloseTo(4 * sixteenth());
    expect(stepTime(5)).toBeGreaterThan(5 * sixteenth());
  });
});

describe("timeline after a late clock", () => {
  it("leaves an on-time schedule alone", () => {
    expect(nextBarAfter(5, 10.2, 10, 3)).toEqual({ bar: 5, time: 10.2 });
  });
  it("skips missed bars but resumes right away instead of replaying them", () => {
    // Bar 5 was due at 10 s; the tab woke at 17.5 s: bars 5–7 are gone, bar 8 starts now.
    expect(nextBarAfter(5, 10, 17.5, 3)).toEqual({
      bar: 8,
      time: 17.5 + RESUME_DELAY
    });
  });
});

describe("volume", () => {
  it("follows a perceptual curve from silence to a safe maximum", () => {
    expect(volumeGain(0)).toBe(0);
    expect(volumeGain(0.5)).toBeLessThan(volumeGain(1) / 2);
    expect(volumeGain(1)).toBeLessThanOrEqual(1);
  });
});
