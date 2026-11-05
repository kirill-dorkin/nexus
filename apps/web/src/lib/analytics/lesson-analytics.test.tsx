import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LessonAnalytics } from "./lesson-analytics";
import { emitLearningStep } from "./lesson-tracker";

const fetchMock = vi.fn<typeof fetch>(() =>
  Promise.resolve(new Response(null, { status: 204 }))
);

function batches(): unknown[] {
  return fetchMock.mock.calls.map(([, init]) => {
    const body = init?.body;
    return typeof body === "string" ? (JSON.parse(body) as unknown) : null;
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "https://api.example.test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("LessonAnalytics in the browser", () => {
  it("sends the view and steps with the session cookie and stops on unmount", () => {
    const view = render(
      <LessonAnalytics
        organizationSlug="home"
        offeringSlug="html"
        lessonSlug="links"
      />
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown"));
      emitLearningStep("video_started");
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.test/v1/analytics/learning");
    expect(init).toMatchObject({
      method: "POST",
      keepalive: true,
      credentials: "include"
    });
    const sent = JSON.stringify(batches());
    expect(sent).toContain("lesson_viewed");
    expect(sent).toContain("video_started");

    view.unmount();
    fetchMock.mockClear();
    act(() => {
      emitLearningStep("practice_run");
      window.dispatchEvent(new Event("pagehide"));
      vi.advanceTimersByTime(60_000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("flushes when the page becomes hidden", () => {
    render(
      <LessonAnalytics
        organizationSlug="home"
        offeringSlug="html"
        lessonSlug="links"
      />
    );
    fetchMock.mockClear();
    act(() => {
      emitLearningStep("signup_clicked");
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden"
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    expect(JSON.stringify(batches())).toContain("signup_clicked");
  });
});
