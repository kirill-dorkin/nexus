import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { evaluateAssignment, type AssignmentCheck } from "./assignment";
import { parseHtmlOnServer } from "./server";

// ADR-0073: every file assignment in the published courses is solvable by its
// own reference solution and not already solved by its starter files.

const root = fileURLToPath(new URL("../../..", import.meta.url));

type Activity = {
  slug: string;
  type: string;
  presentation: { entry?: string; starterFiles: Record<string, string> };
  validation: {
    checks: AssignmentCheck[];
    solutionFiles: Record<string, string>;
  };
};

const assignments = (track: string): Activity[] =>
  (
    JSON.parse(
      readFileSync(
        path.join(root, `docs/examples/${track}-track.manifest.json`),
        "utf8"
      )
    ) as { activities: Activity[] }
  ).activities.filter((activity) => activity.type === "assignment.files");

describe.each(["html", "css"])("%s course file assignments", (track) => {
  const list = assignments(track);

  it("has assignments", () => {
    expect(list.length).toBeGreaterThan(0);
  });

  it.each(list.map((activity) => [activity.slug, activity] as const))(
    "%s: the solution passes, the starter does not",
    (_, activity) => {
      const spec = {
        entry: activity.presentation.entry ?? "index.html",
        checks: activity.validation.checks
      };
      const solved = evaluateAssignment(
        activity.validation.solutionFiles,
        spec,
        parseHtmlOnServer
      );
      expect(
        solved.checks
          .filter((check) => !check.passed)
          .map((check) => check.label)
      ).toEqual([]);
      const starter = evaluateAssignment(
        activity.presentation.starterFiles,
        spec,
        parseHtmlOnServer
      );
      expect(starter.outcome).toBe("failed");
      expect(new Set(spec.checks.map((check) => check.label)).size).toBe(
        spec.checks.length
      );
    }
  );
});
