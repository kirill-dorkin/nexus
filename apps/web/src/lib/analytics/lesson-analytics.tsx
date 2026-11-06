"use client";
import { useEffect } from "react";

import { startBrowserLessonTracker } from "./browser-tracker";

/** Mounted once per lesson page: counts the view, steps and active time (ADR-0084). */
export function LessonAnalytics({
  organizationSlug,
  offeringSlug,
  lessonSlug
}: {
  organizationSlug: string;
  offeringSlug: string;
  lessonSlug: string;
}) {
  useEffect(
    () =>
      startBrowserLessonTracker({ organizationSlug, offeringSlug, lessonSlug }),
    [organizationSlug, offeringSlug, lessonSlug]
  );
  return null;
}
