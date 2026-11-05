"use client";
import type {
  LearningAnalyticsEvent,
  LearningStepName
} from "@platform/contracts";

import { publicApiUrl } from "../public-api";
import {
  LEARNING_STEP_EVENT,
  createLessonTracker,
  type LessonAddress
} from "./lesson-tracker";

const INPUT_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "wheel",
  "touchstart"
] as const;

/** Sends a batch in the background with the session cookie, so signed-in time is attributed. */
function send(events: LearningAnalyticsEvent[]) {
  void fetch(publicApiUrl("/v1/analytics/learning"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ events }),
    keepalive: true,
    credentials: "include"
  }).catch(() => undefined);
}

export function startBrowserLessonTracker(address: LessonAddress) {
  const tracker = createLessonTracker(
    address,
    send,
    {
      now: () => Date.now(),
      setInterval: (fn, ms) => {
        const id = window.setInterval(fn, ms);
        return () => {
          window.clearInterval(id);
        };
      }
    },
    {
      visible: () => document.visibilityState === "visible",
      onInput: (fn) => {
        for (const name of INPUT_EVENTS)
          window.addEventListener(name, fn, { passive: true });
        return () => {
          for (const name of INPUT_EVENTS) window.removeEventListener(name, fn);
        };
      },
      onHide: (fn) => {
        const onVisibility = () => {
          if (document.visibilityState === "hidden") fn();
        };
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pagehide", fn);
        return () => {
          document.removeEventListener("visibilitychange", onVisibility);
          window.removeEventListener("pagehide", fn);
        };
      },
      onStep: (fn) => {
        const listener = (event: Event) => {
          fn((event as CustomEvent<LearningStepName>).detail);
        };
        window.addEventListener(LEARNING_STEP_EVENT, listener);
        return () => {
          window.removeEventListener(LEARNING_STEP_EVENT, listener);
        };
      }
    }
  );
  tracker.start();
  return () => {
    tracker.stop();
  };
}
