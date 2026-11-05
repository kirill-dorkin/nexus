import { describe, expect, it } from "vitest";

import {
  courseManifestV1Schema,
  courseManifestV1SchemaWith
} from "./course-manifest";
import {
  branchTestThreshold,
  isSkillTestAnswerCorrect,
  skillTestActivitySlug,
  skillTestDrawSchema,
  skillTestResultSchema,
  submitSkillTestRequestSchema,
  type SkillTestQuestion
} from "./skill-test";

const choice = (key: string): SkillTestQuestion => ({
  key,
  kind: "single_choice",
  prompt: "Какой тег делает заголовок?",
  options: [
    { id: "a", text: "<h1>", explanation: "Да, это заголовок." },
    { id: "b", text: "<p>", explanation: "Это абзац." }
  ],
  correct: ["a"],
  explanation: "Заголовки — h1…h6."
});

function manifest(
  questions: unknown[] = [...Array(12)].map((_, i) => choice(`q-${i}`))
): any {
  return {
    schemaVersion: 1,
    course: { slug: "course", title: "Курс", description: "" },
    skills: [{ key: "tags", title: "Теги", description: "" }],
    activities: [],
    lessons: [
      {
        slug: "start",
        title: "Старт",
        summary: "",
        durationMinutes: 5,
        blocks: [{ type: "markdown", markdown: "Текст" }]
      }
    ],
    skillTests: [{ skillKey: "tags", questions }]
  };
}

const issues = (value: unknown, schema = courseManifestV1Schema) => {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe("manifest skillTests (ADR-0075)", () => {
  it("accepts a bank of 12 and keeps it optional", () => {
    expect(issues(manifest())).toEqual([]);
    const without = manifest();
    delete without.skillTests;
    expect(issues(without)).toEqual([]);
  });

  it("needs 12 questions unless a fixture lowers it, never below a draw", () => {
    const small = manifest([...Array(5)].map((_, i) => choice(`q-${i}`)));
    expect(issues(small)).toContain(
      "A skill test needs at least 12 questions."
    );
    expect(
      issues(small, courseManifestV1SchemaWith({ minQuestionsPerSkill: 5 }))
    ).toEqual([]);
    const tiny = manifest([...Array(4)].map((_, i) => choice(`q-${i}`)));
    expect(
      issues(tiny, courseManifestV1SchemaWith({ minQuestionsPerSkill: 1 }))
    ).toContain("A skill test needs at least 5 questions.");
  });

  it.each([
    [
      "duplicate question keys",
      (m: any) => (m.skillTests[0].questions[1].key = "q-0"),
      "Duplicate question key: q-0."
    ],
    [
      "a correct id outside the options",
      (m: any) => (m.skillTests[0].questions[0].correct = ["z"]),
      "Correct option must exist in options."
    ],
    [
      "two correct ids for a single choice",
      (m: any) => (m.skillTests[0].questions[0].correct = ["a", "b"]),
      "Exactly one option is correct."
    ],
    [
      "an option without explanation",
      (m: any) => delete m.skillTests[0].questions[0].options[0].explanation,
      "Invalid input: expected string, received undefined"
    ],
    [
      "an unknown skill",
      (m: any) => (m.skillTests[0].skillKey = "other"),
      "Unknown course skill: other."
    ],
    [
      "a second bank for one skill",
      (m: any) => m.skillTests.push(m.skillTests[0]),
      "Duplicate skill test: tags."
    ],
    [
      "a code question without code",
      (m: any) => (m.skillTests[0].questions[0].kind = "code_output"),
      "This question kind shows a code block."
    ],
    [
      "a short text question with options",
      (m: any) => {
        const q = m.skillTests[0].questions[0];
        q.kind = "short_text";
        q.accepted = ["h1"];
      },
      "A short text question has no options."
    ],
    [
      "accepted answers on a choice",
      (m: any) => (m.skillTests[0].questions[0].accepted = ["a"]),
      "Only a short text question has accepted answers."
    ],
    [
      "an activity slug taken by the skill test",
      (m: any) =>
        m.activities.push({
          slug: skillTestActivitySlug("tags"),
          type: "quiz.short_text",
          title: "Квиз",
          skillKeys: ["tags"],
          presentation: { question: "?" },
          validation: {
            acceptedAnswers: ["a"],
            caseSensitive: false,
            explanation: ""
          }
        }),
      "Activity slug skill-test-tags is reserved for the skill test."
    ]
  ])("refuses %s", (_name, change, message) => {
    const value = manifest();
    change(value);
    expect(issues(value)).toContain(message);
  });

  it("grades choices as sets and short text by NFC, trim and case", () => {
    const multiple: SkillTestQuestion = {
      ...choice("m"),
      kind: "multiple_choice",
      correct: ["a", "b"]
    };
    const target = { skillKey: "tags", key: "m" };
    expect(
      isSkillTestAnswerCorrect(multiple, { ...target, optionIds: ["b", "a"] })
    ).toBe(true);
    expect(
      isSkillTestAnswerCorrect(multiple, { ...target, optionIds: ["a"] })
    ).toBe(false);
    expect(isSkillTestAnswerCorrect(multiple, { ...target, text: "a" })).toBe(
      false
    );
    const text: SkillTestQuestion = {
      key: "t",
      kind: "short_text",
      prompt: "Как называется тег абзаца?",
      correct: [],
      accepted: ["Ёлка"],
      explanation: "p"
    };
    const decomposed = "Ёлка";
    expect(
      isSkillTestAnswerCorrect(text, { ...target, text: ` ${decomposed} ` })
    ).toBe(true);
    expect(isSkillTestAnswerCorrect(text, { ...target, text: "ёлка" })).toBe(
      true
    );
    expect(
      isSkillTestAnswerCorrect(
        { ...text, caseSensitive: true },
        { ...target, text: "ёлка" }
      )
    ).toBe(false);
  });

  it("asks a branch for the same 4 of 5 share", () => {
    expect([1, 2, 3, 4, 5, 10].map(branchTestThreshold)).toEqual([
      1, 2, 3, 4, 4, 8
    ]);
  });

  it("keeps answers out of a draw and refuses repeated selections", () => {
    const draw = {
      drawKey: "0194f6c2-1b2c-7d3e-8f40-123456789abc",
      scope: { type: "skill", skillKey: "tags" },
      threshold: 4,
      questions: [
        {
          skillKey: "tags",
          key: "q-1",
          kind: "single_choice",
          prompt: "?",
          options: [
            { id: "a", text: "A" },
            { id: "b", text: "B" }
          ]
        }
      ]
    };
    expect(skillTestDrawSchema.safeParse(draw).success).toBe(true);
    const leaking = structuredClone(draw) as any;
    leaking.questions[0].correct = ["a"];
    expect(skillTestDrawSchema.safeParse(leaking).success).toBe(false);
    leaking.questions[0] = { ...draw.questions[0], explanation: "x" };
    expect(skillTestDrawSchema.safeParse(leaking).success).toBe(false);
    expect(
      submitSkillTestRequestSchema.safeParse({
        answers: [{ skillKey: "tags", key: "q-1", optionIds: ["a", "a"] }]
      }).success
    ).toBe(false);
    expect(
      skillTestResultSchema.safeParse({
        drawKey: draw.drawKey,
        scope: draw.scope,
        outcome: "passed",
        correctCount: 4,
        total: 5,
        threshold: 4,
        retryAfter: null,
        questions: [
          {
            skillKey: "tags",
            key: "q-1",
            correct: true,
            explanation: "x",
            chosen: [{ id: "a", explanation: "y" }]
          }
        ]
      }).success
    ).toBe(true);
  });
});
