"use client";
import Link from "next/link";
import { Alert } from "@platform/ui";
import { useOwnProgress } from "./navigator/own-progress";

/**
 * Soft order (owner decision, 2026-11-06): every lesson stays open, but a learner who
 * started the course and jumped past their next lesson is pointed back to it.
 * Guests and learners on or before their next lesson see nothing.
 */
export function LessonOrderHint({
  organizationSlug,
  offeringSlug,
  lessons,
  current,
  hrefFor
}: {
  organizationSlug: string;
  offeringSlug: string;
  lessons: readonly { slug: string; title: string }[];
  current: string;
  hrefFor: Readonly<Record<string, string>>;
}) {
  const progress = useOwnProgress(organizationSlug, offeringSlug);
  if (!progress?.next || progress.passed.has(current)) return null;
  const nextIndex = lessons.findIndex((l) => l.slug === progress.next);
  const currentIndex = lessons.findIndex((l) => l.slug === current);
  const next = lessons[nextIndex];
  const href = next ? hrefFor[next.slug] : undefined;
  if (!next || !href || currentIndex <= nextIndex) return null;
  return (
    <Alert tone="accent" title="Вы забежали вперёд">
      Урок открыт, но лучше идти по порядку: сначала пройдите урок{" "}
      {nextIndex + 1} — <Link href={href}>{next.title}</Link>.
    </Alert>
  );
}
