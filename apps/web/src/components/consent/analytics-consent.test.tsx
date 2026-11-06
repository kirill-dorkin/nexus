import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const analytics = vi.hoisted(() => ({
  key: "phc_test",
  consent: "pending",
  setConsent: vi.fn(() => Promise.resolve()),
  identifyLearner: vi.fn(() => Promise.resolve()),
  productAnalytics: vi.fn(() => Promise.resolve(null))
}));

vi.mock("../../lib/analytics/product-analytics", () => ({
  get POSTHOG_KEY() {
    return analytics.key;
  },
  readConsent: () => analytics.consent,
  setConsent: analytics.setConsent,
  identifyLearner: analytics.identifyLearner,
  productAnalytics: analytics.productAnalytics
}));

const me = vi.hoisted(() => vi.fn<() => Promise<Response>>());
vi.mock("../../lib/public-api", () => ({ browserApiRequest: me }));

import { AnalyticsConsent } from "./analytics-consent";

const ok = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe("AnalyticsConsent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    analytics.key = "phc_test";
    analytics.consent = "pending";
    me.mockReset();
    me.mockImplementation(() => ok({ id: "user-1" }));
    analytics.setConsent.mockClear();
    analytics.identifyLearner.mockClear();
    analytics.productAnalytics.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("asks once, a moment after the page, and remembers «Принять»", async () => {
    render(<AnalyticsConsent />);
    expect(screen.queryByRole("region")).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(analytics.productAnalytics).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Принять" }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(analytics.setConsent).toHaveBeenCalledWith("granted");
    expect(analytics.identifyLearner).toHaveBeenCalledWith("user-1");
    expect(screen.queryByRole("button", { name: "Принять" })).toBeNull();
  });

  it("keeps the visitor anonymous after «Только необходимые»", async () => {
    render(<AnalyticsConsent />);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    fireEvent.click(screen.getByRole("button", { name: "Только необходимые" }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(analytics.setConsent).toHaveBeenCalledWith("denied");
    expect(analytics.identifyLearner).not.toHaveBeenCalled();
  });

  it("does not ask again, and links a signed-in learner who accepted before", async () => {
    analytics.consent = "granted";
    render(<AnalyticsConsent />);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(screen.queryByRole("button", { name: "Принять" })).toBeNull();
    expect(analytics.identifyLearner).toHaveBeenCalledWith("user-1");
  });

  it("ignores a guest and a broken /v1/me", async () => {
    analytics.consent = "granted";
    me.mockImplementationOnce(() =>
      Promise.resolve(new Response("", { status: 401 }))
    );
    render(<AnalyticsConsent />);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(analytics.identifyLearner).not.toHaveBeenCalled();

    me.mockImplementationOnce(() => Promise.reject(new Error("offline")));
    render(<AnalyticsConsent />);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(analytics.identifyLearner).not.toHaveBeenCalled();
  });

  it("renders nothing and starts nothing without a project key", async () => {
    analytics.key = "";
    render(<AnalyticsConsent />);
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(analytics.productAnalytics).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Принять" })).toBeNull();
  });
});
