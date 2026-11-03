// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientError, errorName } from "./errors";
import { createReporter, type Send } from "./reporter";
import { routeTemplate } from "./route";

describe("routeTemplate", () => {
  it.each([
    ["/", "/"],
    ["/courses", "/courses"],
    ["/courses/html", "/courses/[course]"],
    ["/courses/html/first-tag", "/courses/[course]/[lesson]"],
    ["/learn/acme/web/intro", "/learn/[organization]/[offering]/[lesson]"],
    ["/studio/0195/0196", "/studio/[organization]/[course]"],
    ["/studio/0195/entry-policy", "/studio/[organization]/entry-policy"],
    [
      "/studio/0195/0196/offerings",
      "/studio/[organization]/[course]/offerings"
    ],
    ["/purchases/abc", "/purchases/[purchase]"],
    ["/wp-admin/../../etc", "other"]
  ])("%s → %s", (path, template) => {
    expect(routeTemplate(path)).toBe(template);
  });
});

describe("client errors", () => {
  it("keeps only the error's name, never its message", () => {
    expect(errorName(new TypeError("user@example.com"))).toBe("TypeError");
    expect(
      errorName(Object.assign(new Error("x"), { name: "MyCustomError" }))
    ).toBe("other");
    expect(errorName("plain string")).toBe("non_error");
    expect(clientError("render", new RangeError("secret"), "/")).toEqual({
      type: "client_error",
      kind: "render",
      errorName: "RangeError",
      source: "app",
      route: "/"
    });
  });

  it("marks errors thrown by scripts from other origins as external", () => {
    expect(
      clientError(
        "error",
        new Error(),
        "/",
        `${window.location.origin}/_next/x.js`
      )
    ).toMatchObject({ source: "app" });
    expect(
      clientError(
        "error",
        new Error(),
        "/",
        "chrome-extension://abc/content.js"
      )
    ).toMatchObject({ source: "external" });
  });
});

describe("createReporter", () => {
  const vital = {
    type: "web_vital",
    name: "LCP",
    rating: "good",
    value: 900,
    route: "/"
  } as const;
  let send: ReturnType<typeof vi.fn<Send>>;
  beforeEach(() => {
    vi.useFakeTimers();
    send = vi.fn<Send>();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("batches events and sends them after a short delay", () => {
    const reporter = createReporter("r1", send);
    reporter.report(vital);
    reporter.report({ ...vital, name: "CLS", value: 0.01 });
    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(send).toHaveBeenCalledOnce();
    expect(JSON.parse(send.mock.calls[0]![0])).toMatchObject({
      release: "r1",
      events: [{ name: "LCP" }, { name: "CLS" }]
    });
  });

  it("sends at once when the batch is full, and on flush", () => {
    const reporter = createReporter("r1", send);
    for (let i = 0; i < 20; i++) reporter.report(vital);
    expect(send).toHaveBeenCalledOnce();
    reporter.report(vital);
    reporter.flush();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("reports a repeated error once and caps errors per page", () => {
    const reporter = createReporter("r1", send);
    const error = clientError("error", new TypeError(), "/");
    for (let i = 0; i < 5; i++) reporter.report(error);
    reporter.flush();
    expect(JSON.parse(send.mock.calls[0]![0]).events).toHaveLength(1);
  });

  it("never throws when sending fails", () => {
    const reporter = createReporter("r1", () => {
      throw new Error("offline");
    });
    reporter.report(vital);
    expect(() => reporter.flush()).not.toThrow();
  });
});
