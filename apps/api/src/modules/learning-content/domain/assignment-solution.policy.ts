import { evaluateAssignment } from "@platform/checks";
import {
  parseHtmlOnServer,
  UncheckablePageError
} from "@platform/checks/server";
import type { CourseManifestV1 } from "@platform/contracts";

export type AssignmentSolutionProblem = Readonly<{
  activitySlug: string;
  failedChecks: readonly string[];
}>;

/**
 * ADR-0073: an assignment is published only if its reference solution passes
 * its own checks, with the same evaluation learners get on the server.
 */
export function assignmentSolutionProblems(
  manifest: CourseManifestV1
): AssignmentSolutionProblem[] {
  const problems: AssignmentSolutionProblem[] = [];
  for (const activity of manifest.activities) {
    if (activity.type !== "assignment.files") continue;
    let failedChecks: string[];
    try {
      failedChecks = evaluateAssignment(
        activity.validation.solutionFiles,
        {
          entry: activity.presentation.entry,
          checks: activity.validation.checks
        },
        parseHtmlOnServer
      )
        .checks.filter((check) => !check.passed)
        .map((check) => check.label);
    } catch (error) {
      if (!(error instanceof UncheckablePageError)) throw error;
      failedChecks = ["The reference page is too large or too deeply nested."];
    }
    if (failedChecks.length)
      problems.push({ activitySlug: activity.slug, failedChecks });
  }
  return problems;
}
