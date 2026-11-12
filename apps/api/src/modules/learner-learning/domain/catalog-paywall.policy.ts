/**
 * ADR-0087 §4: the first chapter of every course is free for signed-in learners; recording
 * progress in later chapters needs a subscription or the trial once the organization sells one.
 */
export function isFreeLesson(
  lessons: readonly Readonly<{ slug: string; chapter?: string | null }>[],
  lessonSlug: string
): boolean {
  const first = lessons[0];
  const lesson = lessons.find((candidate) => candidate.slug === lessonSlug);
  if (first === undefined || lesson === undefined) return false;
  return lesson.chapter === first.chapter;
}
