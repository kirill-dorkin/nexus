import type { LearnerCourseProgress } from "@platform/contracts";
import type { LearnerLessonStructure } from "../../learning-content/application/learner-course-content.query";
import type { CourseActivityObservation } from "../../learning-progress/application/course-activity-progress.query";
/** Task completion is independent of Mastery, readiness and Enrollment completion. */
export function deriveCourseProgress(
  structure: readonly LearnerLessonStructure[],
  observations: readonly CourseActivityObservation[]
): LearnerCourseProgress {
  const passed = new Set(
    observations.filter((o) => o.passed).map((o) => o.activityVersionId)
  );
  const required = new Set(
    structure.flatMap((l) =>
      l.activities.filter((a) => a.required).map((a) => a.activityVersionId)
    )
  );
  const passedRequired = [...required].filter((id) => passed.has(id)).length;
  const lessons = structure.map((l) => {
    const tasks = new Map(
      l.activities
        .filter((a) => a.required)
        .map((a) => [a.activityVersionId, a])
    );
    const passedRequired = [...tasks.keys()].filter((id) =>
      passed.has(id)
    ).length;
    const allActivities = new Map(
      l.activities.map((a) => [a.activityVersionId, a])
    );
    return {
      slug: l.slug,
      totalRequired: tasks.size,
      passedRequired,
      requiredPassed: tasks.size > 0 && passedRequired === tasks.size,
      activities: [...allActivities.values()].map((a) => ({
        slug: a.slug,
        passed: passed.has(a.activityVersionId)
      }))
    };
  });
  const actionTimes = observations.map((o) => o.lastActionAt).sort();
  return {
    policyKey: "required-activity-passes",
    policyVersion: 1,
    passedRequired,
    totalRequired: required.size,
    percentage: required.size
      ? Math.floor((100 * passedRequired) / required.size)
      : null,
    allRequiredPassed: required.size > 0 && passedRequired === required.size,
    nextLessonSlug: required.size
      ? (lessons.find((l) => l.passedRequired < l.totalRequired)?.slug ?? null)
      : (structure[0]?.slug ?? null),
    lastActionAt: actionTimes.at(-1) ?? null,
    lessons
  };
}
