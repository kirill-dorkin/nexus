import { randomUUID } from "node:crypto";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  ownSkillsSchema,
  ownSkillTestsSchema,
  skillTestDrawSchema,
  skillTestResultSchema,
  type SkillTestDraw,
  type SkillTestQuestion
} from "@platform/contracts";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";
import { SKILL_BRANCHES } from "./modules/learner-learning/domain/skill-branches.generated";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";
import { createTestOrganization } from "./test-support/create-test-organization";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw Error(`${name} required`);
  return v;
}

// Answers and explanations carry these markers; no learner payload may contain them.
const SECRET = "секрет-банка";
const kinds = [
  "single_choice",
  "multiple_choice",
  "short_text",
  "code_output",
  "find_bug"
] as const;

function bank(skill: string, count = 12): SkillTestQuestion[] {
  return Array.from({ length: count }, (_, index) => {
    const kind = kinds[index % kinds.length]!;
    const base = {
      key: `q-${index + 1}`,
      kind,
      prompt: `Вопрос ${index + 1} о навыке ${skill}`,
      explanation: `Пояснение ${index + 1}: ${SECRET}`
    };
    if (kind === "short_text")
      return {
        ...base,
        correct: [],
        accepted: [`Ответ ${SECRET} ${index + 1}`]
      };
    return {
      ...base,
      ...(kind === "code_output" || kind === "find_bug"
        ? { code: { language: "html" as const, source: "<p>Привет</p>" } }
        : {}),
      options: ["a", "b", "c"].map((id) => ({
        id,
        text: `Вариант ${id}`,
        explanation: `Почему ${id}: ${SECRET}`
      })),
      correct: kind === "multiple_choice" ? ["a", "b"] : ["a"]
    };
  });
}

type Answer =
  | { skillKey: string; key: string; optionIds: string[] }
  | { skillKey: string; key: string; text: string };

/** Answers to a draw; `wrong` lists how many to answer incorrectly. */
function answers(draw: SkillTestDraw, wrong = 0): Answer[] {
  return draw.questions.map((question, index) => {
    const target = { skillKey: question.skillKey, key: question.key };
    const correct = index >= wrong;
    const number = Number(question.key.slice(2));
    if (question.kind === "short_text")
      return {
        ...target,
        // NFC, trimmed and case-insensitive.
        text: correct ? `  ответ ${SECRET.toUpperCase()} ${number} ` : "нет"
      };
    if (question.kind === "multiple_choice")
      return { ...target, optionIds: correct ? ["b", "a"] : ["a"] };
    return { ...target, optionIds: correct ? ["a"] : ["c"] };
  });
}

describe("skill test HTTP + PostgreSQL boundary (ADR-0075)", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL"));
  const origin = "https://learning.example.test",
    oldOrigin = process.env.WEB_APP_ORIGIN;
  const users: string[] = [];
  let app: NestFastifyApplication,
    owner: string,
    learner: string,
    second: string,
    stranger: string,
    org: { id: string; slug: string };
  const offeringSlug = "skill-test-course";
  // A short branch of the skill map, so the branch test covers every one of its skills.
  const [branchId, branchSkills] = Object.entries(SKILL_BRANCHES).find(
    ([, skills]) => skills.length >= 2 && skills.length <= 4
  )!;
  const skill = branchSkills[0]!;

  async function request(
    method: "POST" | "GET" | "PATCH" | "PUT",
    path: string,
    payload: object | undefined,
    actor: string | null,
    expected = 200
  ) {
    const r = await app.inject({
      method,
      url: `/v1/${path}`,
      headers: { origin, ...(actor ? { "x-test-user-id": actor } : {}) },
      ...(payload !== undefined ? { payload } : {})
    });
    expect(r.statusCode, r.body).toBe(expected);
    return r;
  }
  const testPath = (key = skill) =>
    `me/learning/${org.slug}/skills/${key}/tests`;
  const branchPath = (id = branchId) =>
    `me/learning/${org.slug}/branches/${id}/tests`;
  async function start(
    user: string,
    drawKey: string = randomUUID(),
    expected = 200
  ) {
    const r = await request("POST", testPath(), { drawKey }, user, expected);
    if (expected !== 200) return { response: r, draw: null };
    expect(r.headers["cache-control"]).toBe("no-store");
    expect(r.body).not.toContain(SECRET);
    return { response: r, draw: skillTestDrawSchema.parse(r.json()) };
  }
  const submit = (
    user: string,
    draw: SkillTestDraw,
    body: Answer[],
    expected = 200
  ) =>
    request(
      "POST",
      `${testPath()}/${draw.drawKey}/submission`,
      { answers: body },
      user,
      expected
    );
  const confirmedDays = async (user: string, key = skill) =>
    ownSkillsSchema
      .parse(
        (await request("GET", `me/skills/${org.slug}`, undefined, user)).json()
      )
      .skills.find((s) => s.skillKey === key)?.confirmedDays ?? [];
  /** Moves the user's skill test Evidence into the past, as if minutes had passed. */
  const age = (user: string, minutes: number) =>
    migration.query(
      `UPDATE learning_progress.evidence e SET created_at=e.created_at - make_interval(mins => $3)
         FROM learning_progress.attempts a JOIN learning_delivery.enrollments n ON n.organization_id=a.organization_id AND n.id=a.enrollment_id
        WHERE e.organization_id=$1 AND a.organization_id=e.organization_id AND a.id=e.attempt_id AND n.user_id=$2 AND e.kind='skill.test'`,
      [org.id, user, minutes]
    );

  const manifest = () => ({
    schemaVersion: 1,
    course: {
      slug: `skill-test-course-${randomUUID()}`,
      title: "Курс с тестами навыков",
      description: ""
    },
    skills: branchSkills.map((key) => ({
      key,
      title: `Навык ${key}`,
      description: ""
    })),
    activities: [
      {
        slug: "lesson-check",
        type: "quiz.single_choice",
        title: "Практика",
        instructions: "",
        skillKeys: [skill],
        presentation: {
          question: "Вопрос урока?",
          options: [
            { id: "yes", text: "Да" },
            { id: "no", text: "Нет" }
          ]
        },
        validation: { correctOptionId: "yes", explanation: "Так и есть." }
      }
    ],
    lessons: [
      {
        slug: "start",
        title: "Старт",
        summary: "",
        durationMinutes: 5,
        blocks: [
          { type: "markdown", markdown: "Текст урока." },
          {
            type: "activity",
            activitySlug: "lesson-check",
            kind: "practice",
            required: true
          }
        ]
      }
    ],
    skillTests: branchSkills.map((key) => ({
      skillKey: key,
      questions: bank(key)
    }))
  });

  async function enter(user: string) {
    await request(
      "POST",
      `public/organizations/${org.slug}/memberships/me`,
      {},
      user
    );
    await request(
      "POST",
      `me/learning/${org.slug}/${offeringSlug}/enrollment`,
      {},
      user
    );
  }

  let exported: { skillTests?: unknown; activities: { slug: string }[] };

  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = origin;
    for (const name of ["Owner", "Learner", "Second", "Stranger"])
      users.push(
        (
          await migration.query<{ id: string }>(
            "INSERT INTO identity.users(email,display_name) VALUES($1,$2) RETURNING id",
            [`${randomUUID()}@example.test`, `Skill test ${name}`]
          )
        ).rows[0]!.id
      );
    [owner, learner, second, stranger] = users as [
      string,
      string,
      string,
      string
    ];
    app = await createApiApplication();
    app
      .getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (req) => {
        const id = req.headers["x-test-user-id"];
        if (typeof id === "string")
          attachPlatformPrincipal(req as PlatformPrincipalCarrier, {
            userId: id
          });
      });
    await app.init();
    org = await createTestOrganization(migration, owner, {
      slug: `skill-tests-${randomUUID()}`,
      name: "Skill test academy"
    });
    const course = manifest();
    const plan = (
      await request(
        "POST",
        `organizations/${org.id}/courses/manifest/validate`,
        course,
        owner
      )
    ).json();
    const applied = (
      await request(
        "POST",
        `organizations/${org.id}/courses/manifest/apply`,
        {
          manifest: course,
          expectedDraftVersionId: plan.expectedDraftVersionId,
          expectedRevision: plan.expectedRevision
        },
        owner
      )
    ).json();
    exported = (
      await request(
        "GET",
        `organizations/${org.id}/courses/${applied.courseId}/versions/${applied.draftVersionId}/manifest`,
        undefined,
        owner
      )
    ).json();
    await request(
      "POST",
      `organizations/${org.id}/courses/${applied.courseId}/versions/${applied.draftVersionId}/publish`,
      {},
      owner
    );
    const offering = (
      await request(
        "POST",
        `organizations/${org.id}/offerings`,
        {
          slug: offeringSlug,
          name: "Skill test offering",
          courseVersionId: applied.draftVersionId,
          deliveryMode: "self_paced",
          accessMode: "membership"
        },
        owner,
        201
      )
    ).json();
    await request(
      "PATCH",
      `organizations/${org.id}/offerings/${offering.id}/visibility`,
      { visibility: "public" },
      owner
    );
    await request(
      "PUT",
      `organizations/${org.id}/customer-entry-policy`,
      { policy: "open" },
      owner
    );
    await enter(learner);
    await enter(second);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (org) {
      for (const table of [
        "events.outbox",
        "learning_history.learning_events",
        "learning_progress.evidence",
        "learning_validation.validation_results",
        "learning_progress.skill_test_draws",
        "learning_progress.submissions",
        "learning_progress.attempts",
        "learning_progress.mastery_projections",
        "learning_delivery.enrollments",
        "learning_delivery.learning_offerings",
        "learning_content.course_version_lesson_blocks",
        "learning_content.course_version_lessons",
        "learning_content.quiz_validation_configs",
        "learning_content.skill_test_banks",
        "learning_content.activity_skill_mappings",
        "learning_content.course_version_activities",
        "learning_content.course_version_skills",
        "learning_content.manifest_activity_identities",
        "learning_content.activities",
        "learning_content.skills",
        "learning_content.courses"
      ])
        await migration.query(`DELETE FROM ${table} WHERE organization_id=$1`, [
          org.id
        ]);
      await migration.query(
        "DELETE FROM organizations.organizations WHERE id=$1",
        [org.id]
      );
    }
    await migration.query(
      "DELETE FROM identity.users WHERE id=ANY($1::uuid[])",
      [users]
    );
    await migration.end();
    if (oldOrigin === undefined) delete process.env.WEB_APP_ORIGIN;
    else process.env.WEB_APP_ORIGIN = oldOrigin;
  });

  it("refuses an incomplete bank at import", async () => {
    const validate = (body: object) =>
      request(
        "POST",
        `organizations/${org.id}/courses/manifest/validate`,
        body,
        owner,
        400
      );
    const small = manifest();
    small.skillTests[0]!.questions = bank(skill, 11);
    await validate(small);
    const duplicate = manifest();
    duplicate.skillTests[0]!.questions[1]!.key = "q-1";
    await validate(duplicate);
    const missing = manifest();
    missing.skillTests[0]!.questions[0]!.correct = ["z"];
    await validate(missing);
    const unexplained = manifest();
    delete (
      unexplained.skillTests[0]!.questions[0]!.options![0] as {
        explanation?: string;
      }
    ).explanation;
    await validate(unexplained);
    const unknown = manifest();
    unknown.skillTests[0]!.skillKey = "no-such-skill";
    await validate(unknown);
  });

  it("imports one skill.test activity per bank and exports the bank back", async () => {
    expect(exported.activities.map((a) => a.slug)).toEqual(["lesson-check"]);
    expect(exported.skillTests).toEqual(manifest().skillTests);
    const rows = await migration.query<{
      config: unknown;
      questions: number;
      skill_key: string;
    }>(
      `SELECT a.config,jsonb_array_length(b.config->'questions')::integer AS questions,s.skill_key
         FROM learning_content.course_version_activities a
         JOIN learning_content.skill_test_banks b ON b.activity_version_id=a.id
         JOIN learning_content.activity_skill_mappings m ON m.organization_id=a.organization_id AND m.course_version_id=a.course_version_id AND m.activity_id=a.activity_id
         JOIN learning_content.skills s ON s.id=m.skill_id
        WHERE a.organization_id=$1 AND a.activity_type='skill.test' ORDER BY a.position`,
      [org.id]
    );
    expect(rows.rows).toEqual(
      branchSkills.map((key) => ({
        skill_key: key,
        questions: 12,
        config: {
          presentation: { skillKey: key, size: 5, threshold: 4 },
          validation: {
            validatorKey: "skill.test",
            validatorVersion: 1,
            config: {}
          }
        }
      }))
    );
  });

  it("keeps answers out of the public lesson and the learner course", async () => {
    const lesson = await request(
      "GET",
      `public/learning/${org.slug}/${offeringSlug}/lessons/start`,
      undefined,
      null
    );
    expect(lesson.body).not.toContain(SECRET);
    expect(lesson.body).not.toContain("skill.test");
    const course = await request(
      "GET",
      `me/learning/${org.slug}/${offeringSlug}`,
      undefined,
      learner
    );
    expect(course.body).not.toContain(SECRET);
  });

  it("needs a session, an own Enrollment and a known skill or branch", async () => {
    const drawKey = randomUUID();
    const answer = {
      answers: [{ skillKey: skill, key: "q-1", optionIds: ["a"] }]
    };
    for (const [path, body] of [
      [testPath(), { drawKey }],
      [`${testPath()}/${drawKey}/submission`, answer],
      [branchPath(), { drawKey }],
      [`${branchPath()}/${drawKey}/submission`, answer]
    ] as const)
      await request("POST", path, body, null, 401);
    await request("GET", `me/skills/${org.slug}/tests`, undefined, null, 401);
    await start(stranger, drawKey, 404);
    await request("POST", testPath("no-such-skill"), { drawKey }, learner, 404);
    await request(
      "POST",
      branchPath("no-such-branch"),
      { drawKey },
      learner,
      404
    );
    await request("POST", testPath(), { drawKey: "nope" }, learner, 400);
    expect(
      ownSkillTestsSchema.parse(
        (
          await request(
            "GET",
            `me/skills/${org.slug}/tests`,
            undefined,
            learner
          )
        ).json()
      )
    ).toEqual({ skillKeys: [...branchSkills].sort() });
    expect(
      (
        await request("GET", `me/skills/${org.slug}/tests`, undefined, stranger)
      ).json()
    ).toEqual({ skillKeys: [] });
  });

  it("draws five unseen questions first and repeats a draw for the same key", async () => {
    const first = (await start(learner)).draw!;
    expect(first.scope).toEqual({ type: "skill", skillKey: skill });
    expect(first.threshold).toBe(4);
    expect(first.questions).toHaveLength(5);
    expect(new Set(first.questions.map((q) => q.key)).size).toBe(5);
    for (const question of first.questions) {
      expect(Object.keys(question)).not.toContain("correct");
      expect(
        question.options?.every((o) => !("explanation" in o)) ?? true
      ).toBe(true);
    }
    const again = (await start(learner, first.drawKey)).draw!;
    expect(again).toEqual(first);
    // Another learner cannot reuse the key.
    await start(second, first.drawKey, 409);

    const seen = new Set(first.questions.map((q) => q.key));
    const next = (await start(learner)).draw!;
    expect(next.questions.some((q) => seen.has(q.key))).toBe(false);
    next.questions.forEach((q) => seen.add(q.key));
    const third = (await start(learner)).draw!;
    const unseen = bank(skill)
      .map((q) => q.key)
      .filter((key) => !seen.has(key));
    expect(unseen).toHaveLength(2);
    for (const key of unseen)
      expect(third.questions.map((q) => q.key)).toContain(key);
  });

  it("grades exactly the drawn questions", async () => {
    const { draw } = await start(second);
    const given = answers(draw!);
    await submit(second, draw!, given.slice(1), 400);
    await submit(
      second,
      draw!,
      [...given.slice(1), { ...given[0]!, key: "q-999" }],
      400
    );
    const undrawn = bank(skill).find(
      (q) => !draw!.questions.some((d) => d.key === q.key)
    )!;
    await submit(
      second,
      draw!,
      [
        ...given.slice(1),
        { skillKey: skill, key: undrawn.key, optionIds: ["a"] }
      ],
      400
    );
    await submit(second, draw!, [...given, given[0]!], 400);
    // Another learner's draw is not theirs to submit.
    await submit(learner, draw!, given, 409);
    await submit(stranger, draw!, given, 404);
    const unknown = { ...draw!, drawKey: randomUUID() };
    await submit(second, unknown, given, 404);
    // Nothing was stored by the refused submissions.
    const linked = await migration.query(
      "SELECT attempt_id FROM learning_progress.skill_test_draws WHERE id=$1",
      [draw!.drawKey]
    );
    expect(linked.rows).toEqual([{ attempt_id: null }]);
  });

  it("does not confirm the skill at 3 of 5 and holds a 10 minute cooldown", async () => {
    const { draw } = await start(learner);
    const failed = skillTestResultSchema.parse(
      (await submit(learner, draw!, answers(draw!, 2))).json()
    );
    expect(failed.outcome).toBe("failed");
    expect(failed.correctCount).toBe(3);
    expect(failed.total).toBe(5);
    expect(failed.questions.filter((q) => !q.correct)).toHaveLength(2);
    expect(failed.questions.every((q) => q.explanation.includes(SECRET))).toBe(
      true
    );
    const wrong = failed.questions.find(
      (q) => !q.correct && q.chosen.length > 0
    );
    if (wrong) expect(wrong.chosen[0]!.explanation).toContain(SECRET);
    const retryAfter = Date.parse(failed.retryAfter!);
    expect(retryAfter - Date.now()).toBeGreaterThan(9 * 60_000);
    expect(retryAfter - Date.now()).toBeLessThanOrEqual(10 * 60_000);
    expect(await confirmedDays(learner)).toEqual([]);

    // The same submission replays its result; different answers are refused.
    expect(
      skillTestResultSchema.parse(
        (await submit(learner, draw!, answers(draw!, 2))).json()
      )
    ).toEqual(failed);
    await submit(learner, draw!, answers(draw!), 409);

    const refused = (await start(learner, randomUUID(), 409)).response.json();
    expect(refused).toMatchObject({
      code: "retake_cooldown",
      retryAfter: failed.retryAfter
    });
    // A draw taken before the failure cannot be submitted during the cooldown either.
    const linked = await migration.query<{ id: string }>(
      "SELECT d.id::text FROM learning_progress.skill_test_draws d JOIN learning_delivery.enrollments n ON n.id=d.enrollment_id WHERE d.organization_id=$1 AND n.user_id=$2 AND d.attempt_id IS NULL LIMIT 1",
      [org.id, learner]
    );
    const pending = linked.rows[0]!.id;
    const pendingDraw = (await start(learner, pending)).draw!;
    await submit(learner, pendingDraw, answers(pendingDraw), 409);

    const draws = await migration.query(
      "SELECT attempt_id::text FROM learning_progress.skill_test_draws WHERE id=$1",
      [draw!.drawKey]
    );
    expect(draws.rows).toEqual([{ attempt_id: draw!.drawKey }]);
    const results = await migration.query(
      "SELECT validator_key,validator_version,idempotency_key,outcome,score::float AS score FROM learning_validation.validation_results v JOIN learning_progress.submissions s ON s.id=v.submission_id WHERE s.attempt_id=$1",
      [draw!.drawKey]
    );
    expect(results.rows).toEqual([
      {
        validator_key: "skill.test",
        validator_version: 1,
        idempotency_key: "skill_test@1",
        outcome: "failed",
        score: 0.6
      }
    ]);

    await age(learner, 11);
    await start(learner);
  });

  it("confirms the skill at 4 of 5 with a confirmed day", async () => {
    const { draw } = await start(second);
    // The earlier refused submissions left this draw unanswered; a new one works the same.
    const passed = skillTestResultSchema.parse(
      (await submit(second, draw!, answers(draw!, 1))).json()
    );
    expect(passed).toMatchObject({
      outcome: "passed",
      correctCount: 4,
      retryAfter: null
    });
    const today = new Date().toISOString().slice(0, 10);
    expect(await confirmedDays(second)).toEqual([today]);
    const evidence = await migration.query(
      "SELECT kind,score::float AS score,payload FROM learning_progress.evidence WHERE attempt_id=$1",
      [draw!.drawKey]
    );
    expect(evidence.rows).toEqual([
      { kind: "skill.test", score: 0.8, payload: { outcome: "passed" } }
    ]);
    // No cooldown after a pass.
    await start(second);
  });

  it("confirms every skill of a branch with one question each", async () => {
    await age(learner, 20);
    const drawKey = randomUUID();
    const draw = skillTestDrawSchema.parse(
      (await request("POST", branchPath(), { drawKey }, learner)).json()
    );
    expect(draw.scope).toEqual({ type: "branch", branchId });
    expect(draw.questions.map((q) => q.skillKey)).toEqual(branchSkills);
    expect(draw.threshold).toBe(Math.ceil((branchSkills.length * 4) / 5));
    expect(
      skillTestDrawSchema.parse(
        (await request("POST", branchPath(), { drawKey }, learner)).json()
      )
    ).toEqual(draw);
    const result = skillTestResultSchema.parse(
      (
        await request(
          "POST",
          `${branchPath()}/${drawKey}/submission`,
          { answers: answers(draw) },
          learner
        )
      ).json()
    );
    expect(result.outcome).toBe("passed");
    expect(result.total).toBe(branchSkills.length);
    const today = new Date().toISOString().slice(0, 10);
    for (const key of branchSkills)
      expect(await confirmedDays(learner, key)).toEqual([today]);
  });
});
