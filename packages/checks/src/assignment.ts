import type { ChallengeCheck } from "./challenge";
import { runStaticChecks, type ParseHtml } from "./evaluate";

/** A check of a file assignment (ADR-0073): a static check with the label the learner sees. */
export type AssignmentCheck = ChallengeCheck & { hint?: string | undefined };

export type AssignmentCheckResult = {
  label: string;
  passed: boolean;
  hint?: string;
};

export type AssignmentEvaluation = {
  checks: AssignmentCheckResult[];
  /** Share of passed checks, 0..1. */
  score: number;
  outcome: "passed" | "failed";
};

/**
 * The text the static checks read: the entry page, then every other `.css`
 * file in path order inside `<style>`, so a rule counts whether it is in the
 * page or in a stylesheet (`readCss` reads `<style>` blocks of HTML).
 */
export function assignmentSource(
  files: Readonly<Record<string, string>>,
  entry: string
): string {
  const stylesheets = Object.keys(files)
    .filter((path) => path !== entry && path.toLowerCase().endsWith(".css"))
    .sort()
    .map((path) => `\n<style>\n${files[path] ?? ""}\n</style>`);
  return (files[entry] ?? "") + stylesheets.join("");
}

/**
 * Evaluates a file assignment. The same function gives the preliminary result
 * in the browser (DOMParser) and the trusted one on the server
 * (`@platform/checks/server`). Nothing is executed.
 */
export function evaluateAssignment(
  files: Readonly<Record<string, string>>,
  assignment: { entry: string; checks: readonly AssignmentCheck[] },
  parseHtml: ParseHtml
): AssignmentEvaluation {
  const page = files[assignment.entry] ?? "";
  const passed = runStaticChecks(
    page,
    assignmentSource(files, assignment.entry),
    assignment.checks,
    parseHtml
  );
  const checks = assignment.checks.map((check, index) => {
    const ok = passed[index] === true;
    return ok || check.hint === undefined
      ? { label: check.label, passed: ok }
      : { label: check.label, passed: ok, hint: check.hint };
  });
  const count = checks.filter((check) => check.passed).length;
  return {
    checks,
    score: checks.length === 0 ? 0 : count / checks.length,
    outcome: checks.length > 0 && count === checks.length ? "passed" : "failed"
  };
}
