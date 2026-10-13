import { describe, expect, it } from "vitest";

import { eventEnvelopeSchema } from "./envelope";

const baseEvent = {
  eventId: "evt_test_1",
  eventName: "learning.activity.started",
  eventVersion: 1,
  occurredAt: "2026-09-13T12:00:00.000Z",
  receivedAt: "2026-09-13T12:00:00.100Z",
  actor: {
    type: "system" as const
  },
  source: "test"
};

describe("canonical event envelope", () => {
  it("normalizes optional collections and privacy defaults", () => {
    const event = eventEnvelopeSchema.parse(baseEvent);

    expect(event.context).toEqual({});
    expect(event.skillIds).toEqual([]);
    expect(event.payload).toEqual({});
    expect(event.privacyClass).toBe("internal");
  });

  it("rejects non-canonical event names", () => {
    expect(() =>
      eventEnvelopeSchema.parse({
        ...baseEvent,
        eventName: "Activity Started"
      })
    ).toThrow();
  });
});
