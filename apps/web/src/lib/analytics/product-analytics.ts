"use client";
/*
 * Product analytics with PostHog (ADR-0086): every page, clicks, sources and paths, session
 * recordings after consent. PostHog is reached through this site's /ingest proxy (next.config.ts),
 * so the Content Security Policy keeps connect-src 'self'.
 *
 * Consent (152-ФЗ, Закон КР «Об информации персонального характера»): until the visitor accepts,
 * and after a refusal, PostHog runs in cookieless mode — no cookies or storage on the device,
 * visitors are counted by a privacy-preserving hash on PostHog's servers. Accepting turns on
 * cookies, a stable anonymous id, session recordings and the link to the account after sign-in.
 */
import type { PostHog } from "posthog-js";

/** The PostHog project key is public by design (it only allows sending events). */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";

export type AnalyticsConsent = "granted" | "denied" | "pending";

const CONSENT_KEY = "dorkin.analytics-consent";

/** The visitor's stored choice; "pending" when there is none or storage is unavailable. */
export function readConsent(
  storage: Pick<Storage, "getItem"> | null
): AnalyticsConsent {
  try {
    const value = storage?.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : "pending";
  } catch {
    return "pending";
  }
}

export function writeConsent(
  storage: Pick<Storage, "setItem"> | null,
  consent: Exclude<AnalyticsConsent, "pending">
) {
  try {
    storage?.setItem(CONSENT_KEY, consent);
  } catch {
    // Private mode or blocked storage: the banner simply asks again next time.
  }
}

const localStorageOrNull = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

let client: Promise<PostHog | null> | null = null;

/** Loads and starts PostHog once per page; null when analytics is off (no key, tests, local). */
export function productAnalytics(): Promise<PostHog | null> {
  if (!POSTHOG_KEY || typeof window === "undefined")
    return Promise.resolve(null);
  client ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-08-30",
      cookieless_mode: "on_reject",
      opt_out_capturing_by_default: true,
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      capture_pageleave: true,
      autocapture: true,
      session_recording: {
        // Passwords and every typed value stay on the device; lesson text is public anyway.
        maskAllInputs: true
      }
    });
    const consent = readConsent(localStorageOrNull());
    if (consent === "granted") posthog.opt_in_capturing();
    return posthog;
  });
  return client;
}

/** Applies the visitor's choice from the banner. */
export async function setConsent(
  consent: Exclude<AnalyticsConsent, "pending">
) {
  writeConsent(localStorageOrNull(), consent);
  const posthog = await productAnalytics();
  if (!posthog) return;
  if (consent === "granted") posthog.opt_in_capturing();
  else posthog.opt_out_capturing();
}

/** Links this browser's events to the signed-in account (internal id only, never the email). */
export async function identifyLearner(userId: string) {
  const posthog = await productAnalytics();
  if (posthog && readConsent(localStorageOrNull()) === "granted")
    posthog.identify(userId);
}

/**
 * Named product events of the learning funnel (ADR-0086). Properties are public slugs and
 * outcomes only — never emails, names, answers or free text.
 */
export type FunnelEvent =
  | "lesson_viewed"
  | "video_started"
  | "practice_run"
  | "signup_clicked"
  | "signup_completed"
  | "login_completed"
  | "course_started"
  | "quiz_checked"
  | "paywall_viewed"
  | "checkout_started";

export type TrackOptions = {
  /**
   * The page is about to navigate away (sign-up, sign-in): send at once with sendBeacon and
   * wait at most `TRACK_BEACON_WAIT_MS` for PostHog to load, so navigation is never held up.
   */
  beforeNavigation?: boolean;
};

export const TRACK_BEACON_WAIT_MS = 400;

/** A named product event, e.g. a quiz answer or a started course. Properties stay small. */
export async function track(
  event: FunnelEvent,
  properties: Record<string, string | number | boolean> = {},
  options: TrackOptions = {}
) {
  try {
    const loading = productAnalytics();
    const posthog = options.beforeNavigation
      ? await Promise.race([
          loading,
          new Promise<null>((resolve) =>
            setTimeout(() => {
              resolve(null);
            }, TRACK_BEACON_WAIT_MS)
          )
        ])
      : await loading;
    posthog?.capture(
      event,
      properties,
      options.beforeNavigation
        ? { send_instantly: true, transport: "sendBeacon" }
        : undefined
    );
  } catch {
    // Analytics never gets in the way of the page.
  }
}

/** Free self-enrollment succeeded; `automatic` when opening a lesson started the course. */
export function trackCourseStarted(
  organization: string,
  offering: string,
  automatic: boolean
) {
  return track("course_started", { organization, offering, automatic });
}
