// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import { TickClock } from "./clock";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("TickClock", () => {
  it("ticks from a page interval when a worker cannot start, and stops", () => {
    vi.useFakeTimers();
    vi.stubGlobal("Worker", undefined);
    const tick = vi.fn();
    const clock = new TickClock(100, tick);
    clock.start();
    clock.start();
    vi.advanceTimersByTime(350);
    expect(tick).toHaveBeenCalledTimes(3);
    clock.stop();
    vi.advanceTimersByTime(1000);
    expect(tick).toHaveBeenCalledTimes(3);
  });

  it("asks the worker for the interval and stops it", () => {
    const posted: unknown[] = [];
    const terminate = vi.fn();
    vi.stubGlobal(
      "Worker",
      class {
        onmessage: (() => void) | null = null;
        postMessage(message: unknown) {
          posted.push(message);
        }
        terminate = terminate;
      }
    );
    const clock = new TickClock(100, vi.fn());
    clock.start();
    clock.stop();
    expect(posted).toEqual([100, 0]);
    expect(terminate).toHaveBeenCalled();
  });
});
