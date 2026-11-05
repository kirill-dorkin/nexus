import type {
  LearningAnalyticsEvent,
  LearningStepName
} from "@platform/contracts";

/**
 * Lesson analytics in the browser (ADR-0084): one view per page, the first video start, the
 * first practice edit and a sign-up click, plus **active** time — seconds while the page is
 * visible and the learner did something in the last minute. Batches are small and sent in the
 * background; analytics never breaks or slows the lesson.
 */
export type LessonAddress = {
  organizationSlug: string;
  offeringSlug: string;
  lessonSlug: string;
};

export const LEARNING_STEP_EVENT = "learning-step";

/** Components report a step without knowing about analytics: video, practice, sign-up. */
export function emitLearningStep(step: LearningStepName): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<LearningStepName>(LEARNING_STEP_EVENT, { detail: step })
  );
}

export const TICK_MS = 5_000;
export const FLUSH_MS = 30_000;
export const IDLE_AFTER_MS = 60_000;

export type TrackerClock = {
  now: () => number;
  setInterval: (fn: () => void, ms: number) => () => void;
};

export type TrackerPage = {
  visible: () => boolean;
  /** Subscribes to learner input and lifecycle; returns an unsubscribe. */
  onInput: (fn: () => void) => () => void;
  onHide: (fn: () => void) => () => void;
  onStep: (fn: (step: LearningStepName) => void) => () => void;
};

export function createLessonTracker(
  address: LessonAddress,
  send: (events: LearningAnalyticsEvent[]) => void,
  clock: TrackerClock,
  page: TrackerPage
) {
  let queue: LearningAnalyticsEvent[] = [];
  const seenSteps = new Set<LearningStepName>();
  let lastInput = clock.now();
  let activeMs = 0;
  let lastTick = clock.now();
  const stops: (() => void)[] = [];

  function step(name: LearningStepName) {
    if (seenSteps.has(name)) return;
    seenSteps.add(name);
    queue.push({ type: "lesson_step", step: name, ...address });
  }

  function tick() {
    const now = clock.now();
    const elapsed = Math.min(now - lastTick, TICK_MS * 2);
    lastTick = now;
    if (page.visible() && now - lastInput < IDLE_AFTER_MS) activeMs += elapsed;
  }

  function flush() {
    tick();
    let seconds = Math.floor(activeMs / 1000);
    activeMs -= seconds * 1000;
    while (seconds > 0) {
      const chunk = Math.min(seconds, 60);
      queue.push({ type: "lesson_active", seconds: chunk, ...address });
      seconds -= chunk;
    }
    while (queue.length > 0) {
      const batch = queue.slice(0, 30);
      queue = queue.slice(30);
      try {
        send(batch);
      } catch {
        // Analytics never breaks the page.
      }
    }
  }

  return {
    start() {
      step("lesson_viewed");
      stops.push(
        page.onInput(() => {
          lastInput = clock.now();
        }),
        page.onStep(step),
        page.onHide(flush),
        clock.setInterval(tick, TICK_MS),
        clock.setInterval(flush, FLUSH_MS)
      );
    },
    stop() {
      flush();
      for (const stop of stops.splice(0)) stop();
    }
  };
}
