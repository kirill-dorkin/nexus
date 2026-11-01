import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { applyCourseManifestRequestSchema, courseManifestV1Schema, normalizeYouTubeVideoId } from "./course-manifest";

function example(): any {
  return JSON.parse(readFileSync(new URL("../../../docs/examples/computer-basics.manifest.json", import.meta.url), "utf8"));
}

describe("course manifest v1", () => {
  it("accepts the example and canonicalizes video URLs, with array order as position", () => {
    const manifest = example();
    manifest.lessons[0].blocks[0].videoId = "https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=12";
    const result = courseManifestV1Schema.parse(manifest);
    expect(result.lessons[0]?.blocks[0]).toEqual({ type: "youtube", videoId: "aqz-KE-bpKQ" });
    expect(result.activities[0]?.type).toBe("quiz.single_choice");
    expect(result.schemaVersion).toBe(1);
  });

  it.each([
    ["unknown version", (m: any) => { m.schemaVersion = 2; }, "schemaVersion"],
    ["unknown authority", (m: any) => { m.organizationId = "foreign"; }, ""],
    ["unknown nested field", (m: any) => { m.lessons[0].blocks[0].iframe = "<iframe>"; }, "lessons.0.blocks.0"],
    ["duplicate lessons", (m: any) => { m.lessons.push(m.lessons[0]); }, "lessons.1.slug"],
    ["duplicate activities", (m: any) => { m.activities.push(m.activities[0]); }, "activities.1.slug"],
    ["duplicate skills", (m: any) => { m.skills.push(m.skills[0]); }, "skills.1.key"],
    ["unknown skill", (m: any) => { m.activities[0].skillKeys = ["foreign-skill"]; }, "activities.0.skillKeys.0"],
    ["duplicate skill reference", (m: any) => { m.activities[0].skillKeys.push(m.activities[0].skillKeys[0]); }, "activities.0.skillKeys.1"],
    ["unknown activity", (m: any) => { m.lessons[0].blocks[2].activitySlug = "foreign-activity"; }, "lessons.0.blocks.2.activitySlug"],
    ["invalid YouTube", (m: any) => { m.lessons[0].blocks[0].videoId = "https://evil.test/?v=aqz-KE-bpKQ"; }, "lessons.0.blocks.0.videoId"],
    ["no lessons", (m: any) => { m.lessons = []; }, "lessons"],
    ["unknown activity type", (m: any) => { m.activities[0].type = "execute-user-code"; }, "activities.0.type"],
    ["missing correct option", (m: any) => { m.activities[0].validation.correctOptionId = "absent"; }, "activities.0.validation.correctOptionId"],
    ["duplicate option", (m: any) => { m.activities[0].presentation.options.push(m.activities[0].presentation.options[0]); }, "activities.0.presentation.options.2.id"],
    ["explicit ambiguous position", (m: any) => { m.lessons[0].position = 5; }, "lessons.0"]
  ])("rejects %s with an actionable path", (_name, mutate, path) => {
    const manifest = example();
    mutate(manifest);
    const result = courseManifestV1Schema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((i) => i.path.join("."))).toContain(path);
  });

  it("accepts an optional lesson chapter and rejects an empty or too long one", () => {
    const base = example();
    base.lessons[0].chapter = "  Формы  ";
    expect(courseManifestV1Schema.parse(base).lessons[0]?.chapter).toBe("Формы");
    for (const chapter of ["", "   ", "x".repeat(81)]) {
      base.lessons[0].chapter = chapter;
      expect(courseManifestV1Schema.safeParse(base).success).toBe(false);
    }
  });
  it("validates multiple choice exact-set configuration", () => {
    const m = example();
    m.activities[0].type = "quiz.multiple_choice";
    m.activities[0].validation = { correctOptionIds: ["cpu", "ram"], explanation: "Example" };
    expect(courseManifestV1Schema.safeParse(m).success).toBe(true);
    m.activities[0].validation.correctOptionIds = ["cpu", "cpu"];
    expect(courseManifestV1Schema.safeParse(m).success).toBe(false);
    m.activities[0].validation.correctOptionIds = ["absent"];
    expect(courseManifestV1Schema.safeParse(m).success).toBe(false);
  });

  it("requires explicit short-text normalization policy and nonempty answers", () => {
    const m = example();
    m.activities[0].type = "quiz.short_text";
    m.activities[0].presentation = { question: "Name a component" };
    m.activities[0].validation = { acceptedAnswers: ["CPU", "Процессор"], caseSensitive: false, explanation: "Example" };
    expect(courseManifestV1Schema.safeParse(m).success).toBe(true);
    delete m.activities[0].validation.caseSensitive;
    expect(courseManifestV1Schema.safeParse(m).success).toBe(false);
    m.activities[0].validation.caseSensitive = false;
    m.activities[0].validation.acceptedAnswers = ["  "];
    expect(courseManifestV1Schema.safeParse(m).success).toBe(false);
  });

  it("requires preview concurrency tokens and rejects client-owned authority", () => {
    expect(applyCourseManifestRequestSchema.safeParse({ manifest: example() }).success).toBe(false);
    const request = { manifest: example(), expectedDraftVersionId: null, expectedRevision: 0 };
    expect(applyCourseManifestRequestSchema.safeParse(request).success).toBe(true);
    expect(applyCourseManifestRequestSchema.safeParse({ ...request, userId: "other" }).success).toBe(false);
  });
});

describe("YouTube locator normalization", () => {
  it.each(["aqz-KE-bpKQ", "https://youtu.be/aqz-KE-bpKQ?si=example", "https://youtube.com/watch?v=aqz-KE-bpKQ", "https://m.youtube.com/shorts/aqz-KE-bpKQ", "https://www.youtube.com/embed/aqz-KE-bpKQ"])("normalizes %s", (input) => {
    expect(normalizeYouTubeVideoId(input)).toBe("aqz-KE-bpKQ");
  });
  it.each(["javascript:alert(1)", "<iframe src=x>", "https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ", "https://evil.test@youtube.com/watch?v=aqz-KE-bpKQ", "http://youtube.com/watch?v=aqz-KE-bpKQ", "https://youtube.com:444/watch?v=aqz-KE-bpKQ", "https://youtube.com/watch?v=aqz-KE-bpKQ&v=other", "https://youtu.be/aqz-KE-bpKQ/extra", "VIDEO_ID"])("fails closed for %s", (input) => {
    expect(normalizeYouTubeVideoId(input)).toBeNull();
  });
});
