import { courseManifestV1Schema } from "@platform/contracts";
import { describe, expect, it } from "vitest";

import { manifest } from "../../test/fixtures";
import {
  planMatchesDraft,
  readManifestFile,
  workingManifest
} from "./editor-model";
import {
  addActivity,
  addBlock,
  addLesson,
  addOption,
  addSkill,
  changeActivityType,
  removeOption,
  removeSkill,
  renameActivity,
  renameOption,
  renameSkill,
  setActivitySkill,
  setChapter,
  setCorrectOption,
  updateBlock
} from "./editor-commands";

const choice = (d: ReturnType<typeof manifest>) => {
  const activity = d.activities[0];
  if (!activity || activity.type === "quiz.short_text")
    throw new Error("Not a choice");
  return activity;
};

describe("skill commands", () => {
  it("renames a skill in every activity", () => {
    const d = manifest();
    renameSkill(d, 0, "markup");
    expect(d.skills[0]?.key).toBe("markup");
    expect(d.activities[0]?.skillKeys).toEqual(["markup"]);
  });

  it("removes a skill and unlinks it, keeping the document valid", () => {
    const d = manifest();
    addSkill(d);
    d.skills[1] = { key: "attrs", title: "Атрибуты", description: "" };
    setActivitySkill(d, 0, "attrs", true);
    removeSkill(d, 0);
    expect(d.skills.map((s) => s.key)).toEqual(["attrs"]);
    expect(d.activities[0]?.skillKeys).toEqual(["attrs"]);
    expect(courseManifestV1Schema.safeParse(d).success).toBe(true);
  });

  it("links and unlinks a skill", () => {
    const d = manifest();
    setActivitySkill(d, 0, "tags", false);
    expect(d.activities[0]?.skillKeys).toEqual([]);
    setActivitySkill(d, 0, "tags", true);
    expect(d.activities[0]?.skillKeys).toEqual(["tags"]);
  });
});

describe("activity commands", () => {
  it("adds a single-choice activity linked to the first skill, or to none", () => {
    const d = manifest();
    addActivity(d);
    expect(d.activities[1]).toMatchObject({
      type: "quiz.single_choice",
      skillKeys: ["tags"]
    });
    d.skills = [];
    addActivity(d);
    expect(d.activities[2]?.skillKeys).toEqual([]);
  });

  it("renames an activity in every lesson block", () => {
    const d = manifest();
    renameActivity(d, 0, "heading");
    expect(d.lessons[0]?.blocks[1]).toMatchObject({ activitySlug: "heading" });
  });

  it("keeps the question, options and answer across type changes", () => {
    const d = manifest();
    changeActivityType(d, 0, "quiz.multiple_choice");
    expect(d.activities[0]).toMatchObject({
      type: "quiz.multiple_choice",
      title: "Первый тег",
      validation: { correctOptionIds: ["h1"], explanation: "Заголовок — h1." }
    });
    changeActivityType(d, 0, "quiz.single_choice");
    expect(d.activities[0]).toMatchObject({
      validation: { correctOptionId: "h1" }
    });
    changeActivityType(d, 0, "quiz.short_text");
    expect(d.activities[0]).toMatchObject({
      type: "quiz.short_text",
      presentation: { question: "Какой тег делает заголовок?" }
    });
  });
});

describe("option commands", () => {
  it("renames an option and the answer that points at it", () => {
    const d = manifest();
    renameOption(d, 0, 0, "heading");
    expect(choice(d).validation).toMatchObject({ correctOptionId: "heading" });
    changeActivityType(d, 0, "quiz.multiple_choice");
    renameOption(d, 0, 0, "h");
    expect(choice(d).validation).toMatchObject({ correctOptionIds: ["h"] });
  });

  it("moves a single answer to the first option when its option is removed", () => {
    const d = manifest();
    addOption(d, 0);
    removeOption(d, 0, 0);
    expect(choice(d).presentation.options.map((o) => o.id)).toEqual(["p", ""]);
    expect(choice(d).validation).toMatchObject({ correctOptionId: "p" });
  });

  it("drops a removed option from multiple answers", () => {
    const d = manifest();
    changeActivityType(d, 0, "quiz.multiple_choice");
    setCorrectOption(d, 0, "p", true);
    removeOption(d, 0, 0);
    expect(choice(d).validation).toMatchObject({ correctOptionIds: ["p"] });
  });

  it("sets the correct option by question type", () => {
    const d = manifest();
    setCorrectOption(d, 0, "p", true);
    expect(choice(d).validation).toMatchObject({ correctOptionId: "p" });
    changeActivityType(d, 0, "quiz.multiple_choice");
    setCorrectOption(d, 0, "h1", true);
    setCorrectOption(d, 0, "p", false);
    expect(choice(d).validation).toMatchObject({ correctOptionIds: ["h1"] });
  });

  it("leaves short-text activities alone", () => {
    const d = manifest();
    changeActivityType(d, 0, "quiz.short_text");
    const before = structuredClone(d);
    addOption(d, 0);
    renameOption(d, 0, 0, "x");
    removeOption(d, 0, 0);
    expect(d).toEqual(before);
  });
});

describe("lesson commands", () => {
  it("adds a ten-minute lesson and empty blocks of every type", () => {
    const d = manifest();
    addLesson(d);
    addBlock(d, 1, "youtube");
    addBlock(d, 1, "markdown");
    addBlock(d, 1, "activity");
    expect(d.lessons[1]).toMatchObject({ durationMinutes: 10 });
    expect(d.lessons[1]?.blocks).toEqual([
      { type: "youtube", videoId: "" },
      { type: "markdown", markdown: "" },
      {
        type: "activity",
        activitySlug: "first-tag",
        kind: "practice",
        required: true
      }
    ]);
  });

  it("removes a blank chapter instead of storing it", () => {
    const d = manifest();
    setChapter(d, 0, "Основы");
    expect(d.lessons[0]?.chapter).toBe("Основы");
    setChapter(d, 0, "   ");
    expect(d.lessons[0]).not.toHaveProperty("chapter");
  });

  it("changes a block only when it has the expected type", () => {
    const d = manifest();
    updateBlock(d, 0, 0, "markdown", (b) => {
      b.markdown = "## Новый";
    });
    updateBlock(d, 0, 0, "youtube", (b) => {
      b.videoId = "never";
    });
    expect(d.lessons[0]?.blocks[0]).toEqual({
      type: "markdown",
      markdown: "## Новый"
    });
  });
});

describe("working copy checks", () => {
  it("accepts a valid manifest of the same course and rejects a changed address", () => {
    const source = JSON.stringify(manifest());
    expect(workingManifest(source, "html").manifest?.course.slug).toBe("html");
    expect(workingManifest(source, null).issues).toEqual([]);
    expect(workingManifest(source, "css")).toEqual({
      manifest: null,
      issues: ["course.slug: адрес существующего курса нельзя менять."]
    });
    expect(workingManifest("{", null).issues).toEqual([
      "JSON: проверьте синтаксис документа."
    ]);
  });

  it("matches a validation plan only to the loaded draft", () => {
    const saved = { status: "draft" as const, versionId: "v1", revision: 3 };
    const plan = {
      courseId: "c",
      expectedDraftVersionId: "v1",
      expectedRevision: 3
    };
    expect(planMatchesDraft(plan, saved, false)).toBe(true);
    expect(
      planMatchesDraft({ ...plan, expectedRevision: 4 }, saved, false)
    ).toBe(false);
    expect(
      planMatchesDraft({ ...plan, expectedDraftVersionId: "v2" }, saved, false)
    ).toBe(false);
    const fresh = {
      courseId: null,
      expectedDraftVersionId: null,
      expectedRevision: 0
    };
    expect(planMatchesDraft(fresh, null, true)).toBe(true);
    expect(planMatchesDraft({ ...fresh, courseId: "taken" }, null, true)).toBe(
      false
    );
    expect(
      planMatchesDraft(
        { ...plan, expectedDraftVersionId: null, expectedRevision: 0 },
        { ...saved, status: "published" },
        false
      )
    ).toBe(true);
  });

  it("reads an uploaded manifest and refuses one over 900 KB", async () => {
    const read = await readManifestFile(new Blob([JSON.stringify(manifest())]));
    expect(read).toMatchObject({ tooLarge: false, issues: [] });
    expect(await readManifestFile(new Blob(["x".repeat(900001)]))).toEqual({
      tooLarge: true
    });
  });
});
