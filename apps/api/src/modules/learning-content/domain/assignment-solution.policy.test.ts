import { courseManifestV1Schema } from "@platform/contracts";
import { describe, expect, it } from "vitest";

import { assignmentSolutionProblems } from "./assignment-solution.policy";

const manifest = (solution: string) =>
  courseManifestV1Schema.parse({
    schemaVersion: 1,
    course: { slug: "files-course", title: "Файлы" },
    skills: [{ key: "html-headings", title: "Заголовки" }],
    activities: [
      {
        slug: "first-page",
        title: "Первая страница",
        type: "assignment.files",
        skillKeys: ["html-headings"],
        presentation: {
          lang: "html",
          starterFiles: { "index.html": "<!doctype html>" },
          allowedFiles: ["index.html", "style.css"]
        },
        validation: {
          checks: [
            { label: "Есть заголовок", selector: "h1" },
            {
              label: "Заголовок красный",
              css: { selector: "h1", property: "color", value: "red" }
            }
          ],
          solutionFiles: { "index.html": solution }
        }
      }
    ],
    lessons: [
      {
        slug: "start",
        title: "Старт",
        durationMinutes: 10,
        blocks: [
          {
            type: "activity",
            activitySlug: "first-page",
            kind: "homework",
            required: true
          }
        ]
      }
    ]
  });

describe("assignment solutions (ADR-0073)", () => {
  it("accepts a solution that passes its own checks", () => {
    expect(
      assignmentSolutionProblems(
        manifest("<style>h1{color:red}</style><h1>Привет</h1>")
      )
    ).toEqual([]);
  });

  it("names the checks a solution fails", () => {
    expect(assignmentSolutionProblems(manifest("<h1>Привет</h1>"))).toEqual([
      { activitySlug: "first-page", failedChecks: ["Заголовок красный"] }
    ]);
  });
});
