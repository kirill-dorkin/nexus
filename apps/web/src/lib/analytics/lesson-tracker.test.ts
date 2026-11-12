import { describe, expect, it } from "vitest";
import type {
  LearningAnalyticsEvent,
  LearningStepName
} from "@platform/contracts";

import {
  FLUSH_MS,
  IDLE_AFTER_MS,
  TICK_MS,
  createLessonTracker
} from "./lesson-tracker";

const address = {
  organizationSlug: "home",
  offeringSlug: "html",
  lessonSlug: "links"
};

function harness(onFirstStep?: (step: LearningStepName) => void) {
  let time = 0;
  let visible = true;
  const intervals: { fn: () => void; ms: number; next: number }[] = [];
  const handlers = {
    input: [] as (() => void)[],
    hide: [] as (() => void)[],
    step: [] as ((s: LearningStepName) => void)[]
  };
  const sent: LearningAnalyticsEvent[][] = [];
  const tracker = createLessonTracker(
    address,
    (events) => sent.push(events),
    {
      now: () => time,
      setInterval: (fn, ms) => {
        const entry = { fn, ms, next: time + ms };
        intervals.push(entry);
        return () => intervals.splice(intervals.indexOf(entry), 1);
      }
    },
    {
      visible: () => visible,
      onInput: (fn) => (handlers.input.push(fn), () => undefined),
      onHide: (fn) => (handlers.hide.push(fn), () => undefined),
      onStep: (fn) => (handlers.step.push(fn), () => undefined)
    },
    onFirstStep
  );
  const advance = (ms: number) => {
    const end = time + ms;
    while (true) {
      const due = intervals
        .filter((i) => i.next <= end)
        .sort((a, b) => a.next - b.next)[0];
      if (!due) break;
      time = due.next;
      due.next += due.ms;
      due.fn();
    }
    time = end;
  };
  const input = () => handlers.input.forEach((f) => f());
  const step = (s: LearningStepName) => handlers.step.forEach((f) => f(s));
  const hide = () => handlers.hide.forEach((f) => f());
  const all = () => sent.flat();
  const activeSeconds = () =>
    all()
      .filter((e) => e.type === "lesson_active")
      .reduce(
        (sum, e) => sum + (e.type === "lesson_active" ? e.seconds : 0),
        0
      );
  return {
    tracker,
    advance,
    input,
    step,
    hide,
    all,
    activeSeconds,
    setVisible: (v: boolean) => {
      visible = v;
    }
  };
}

describe("lesson tracker (ADR-0084)", () => {
  it("reports the view once and each other step once per page", () => {
    const h = harness();
    h.tracker.start();
    h.step("video_started");
    h.step("video_started");
    h.step("practice_run");
    h.tracker.stop();
    const steps = h
      .all()
      .filter((e) => e.type === "lesson_step")
      .map((e) => (e.type === "lesson_step" ? e.step : ""));
    expect(steps).toEqual(["lesson_viewed", "video_started", "practice_run"]);
  });

  it("counts active time only while visible and used in the last minute", () => {
    const h = harness();
    h.tracker.start();
    h.input();
    h.advance(FLUSH_MS); // 30 s active
    expect(h.activeSeconds()).toBe(30);
    h.advance(IDLE_AFTER_MS + FLUSH_MS); // no input: about a minute more, then idle
    const afterIdle = h.activeSeconds();
    expect(afterIdle).toBeLessThanOrEqual(30 + 60 + TICK_MS / 1000);
    h.input();
    h.setVisible(false);
    h.advance(FLUSH_MS); // hidden tab does not count
    expect(h.activeSeconds()).toBe(afterIdle);
  });

  it("flushes when the page hides and splits time into chunks of at most 60 s", () => {
    const h = harness();
    h.tracker.start();
    for (let i = 0; i < 30; i++) {
      h.input();
      h.advance(TICK_MS);
    }
    h.hide();
    for (const event of h.all())
      if (event.type === "lesson_active") {
        expect(event.seconds).toBeGreaterThan(0);
        expect(event.seconds).toBeLessThanOrEqual(60);
        expect(event.lessonSlug).toBe("links");
      }
    expect(h.activeSeconds()).toBe(150);
  });

  it("forwards each first step once to product analytics (ADR-0086)", () => {
    const forwarded: LearningStepName[] = [];
    const h = harness((step) => forwarded.push(step));
    h.tracker.start();
    h.step("signup_clicked");
    h.step("signup_clicked");
    h.step("practice_run");
    expect(forwarded).toEqual([
      "lesson_viewed",
      "signup_clicked",
      "practice_run"
    ]);
  });

  it("keeps counting when the product analytics callback throws", () => {
    const h = harness(() => {
      throw new Error("analytics down");
    });
    h.tracker.start();
    h.step("video_started");
    h.tracker.stop();
    expect(h.all().filter((e) => e.type === "lesson_step")).toHaveLength(2);
  });
});
