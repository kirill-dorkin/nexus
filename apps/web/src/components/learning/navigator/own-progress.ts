"use client";
import { clientLearnerLearningCourseSchema } from "@platform/contracts/client";
import { useEffect, useMemo, useState } from "react";
import { useApiResource } from "../../../lib/hooks/api-resource";

/** What the program needs from the learner's own saved progress in one course. */
export type OwnProgress = {
  /** Lessons whose required task (the lesson test) is passed. */
  passed: ReadonlySet<string>;
  /** The first lesson whose required task is not passed yet; null when all are. */
  next: string | null;
};

// The last answer per course, kept while a refresh after a quiz is loading, so the ticks
// do not flicker back to the guest view.
const lastKnown = new Map<string, OwnProgress>();

export function ownProgressFrom(data: {
  progress: {
    nextLessonSlug: string | null;
    lessons: readonly { slug: string; requiredPassed: boolean }[];
  } | null;
}): OwnProgress | null {
  if (!data.progress) return null;
  return {
    passed: new Set(
      data.progress.lessons.filter((l) => l.requiredPassed).map((l) => l.slug)
    ),
    next: data.progress.nextLessonSlug
  };
}

/**
 * The signed-in learner's progress in this course, refreshed after every checked quiz or
 * assignment. Null for guests and for learners who have not started the course: they keep
 * the browser-only "opened" ticks.
 */
export function useOwnProgress(
  organizationSlug: string,
  offeringSlug: string
): OwnProgress | null {
  const path = `/v1/me/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}`;
  const [version, setVersion] = useState(0);
  const [resource] = useApiResource(
    path,
    clientLearnerLearningCourseSchema,
    version
  );
  useEffect(() => {
    const refresh = () => setVersion((x) => x + 1);
    window.addEventListener("learning-progress-changed", refresh);
    return () =>
      window.removeEventListener("learning-progress-changed", refresh);
  }, []);
  return useMemo(() => {
    if (resource.status === "ready") {
      const progress = ownProgressFrom(resource.data);
      if (progress) lastKnown.set(path, progress);
      else lastKnown.delete(path);
      return progress;
    }
    if (resource.status === "loading") return lastKnown.get(path) ?? null;
    return null;
  }, [resource, path]);
}
