import { FreeLearningDeliveryPort } from "./modules/learning-delivery/application/free-learning-delivery.port";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  courseManifestV1Schema,
  learnerLearningCourseSchema,
  quizCheckResultSchema,
  type QuizAnswer,
  type CourseManifestV1,
  currentRegistrationConsents
} from "@platform/contracts";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestOrganization } from "./test-support/create-test-organization";
import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";
import { OutboxRepository } from "./outbox/outbox.repository";
import { ValidatorRegistry } from "./modules/learning-validation/domain/validator-registry";
function env(name: string) {
  const v = process.env[name];
  if (!v) throw Error(`${name} required`);
  return v;
}
type Fixture = {
  org: string;
  orgSlug: string;
  offering: string;
  version: string;
  course: string;
  slug: string;
  manifest: CourseManifestV1;
};
describe("deterministic learner quiz HTTP + PostgreSQL boundary", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL")),
    runtime = createDatabasePool(env("DATABASE_URL"));
  const origin = "https://learning.example.test",
    oldOrigin = process.env.WEB_APP_ORIGIN;
  const users: string[] = [],
    organizations: string[] = [],
    fixtures: Fixture[] = [];
  let app: NestFastifyApplication,
    owner: string,
    learner: string,
    foreign: string,
    cookie: string,
    base: Fixture;
  async function request(
    method: "POST" | "GET" | "PATCH" | "PUT",
    path: string,
    payload?: object,
    actor = learner,
    expected = 200,
    suppliedOrigin = origin
  ) {
    const r = await app.inject({
      method,
      url: `/v1/${path}`,
      headers: {
        origin: suppliedOrigin,
        ...(actor === learner
          ? { cookie }
          : actor
            ? { "x-test-user-id": actor }
            : {})
      },
      ...(payload !== undefined ? { payload } : {})
    });
    expect(r.statusCode, r.body).toBe(expected);
    return r;
  }
  const route = (f: Fixture) => `me/learning/${f.orgSlug}/${f.slug}`;
  const state = (f = base, actor = learner, expected = 200) =>
    request("GET", route(f), undefined, actor, expected);
  const enroll = (
    f = base,
    actor = learner,
    expected = 200,
    payload: object = {}
  ) => request("POST", `${route(f)}/enrollment`, payload, actor, expected);
  async function join(f = base, actor = learner, expected = 200) {
    return request(
      "POST",
      `public/organizations/${f.orgSlug}/memberships/me`,
      {},
      actor,
      expected
    );
  }
  async function fixture(policy = "open", slug = "free-course") {
    const org = await createTestOrganization(migration, owner, {
      slug: `entry-${randomUUID()}`,
      name: "Learning entry academy"
    });
    organizations.push(org.id);
    const manifest = courseManifestV1Schema.parse(
      JSON.parse(
        readFileSync("docs/examples/computer-basics.manifest.json", "utf8")
      )
    );
    manifest.course.slug = `entry-course-${randomUUID()}`;
    const first = manifest.activities[0]!;
    first.validation.explanation = "PRIVATE QUIZ EXPLANATION " + randomUUID();
    manifest.activities.push(
      {
        slug: "multi-check",
        type: "quiz.multiple_choice",
        title: "Multiple",
        instructions: "Select",
        skillKeys: ["computer-components"],
        presentation: {
          question: "Choose",
          options: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
            { id: "c", text: "C" }
          ]
        },
        validation: {
          correctOptionIds: ["a", "c"],
          explanation: "PRIVATE QUIZ EXPLANATION multi"
        }
      },
      {
        slug: "text-check",
        type: "quiz.short_text",
        title: "Text",
        instructions: "Answer",
        skillKeys: ["computer-components"],
        presentation: { question: "Text question" },
        validation: {
          acceptedAnswers: ["Café"],
          caseSensitive: false,
          explanation: "PRIVATE QUIZ EXPLANATION text"
        }
      }
    );
    for (const activitySlug of ["multi-check", "text-check"])
      manifest.lessons[0]!.blocks.push({
        type: "activity",
        activitySlug,
        kind: "practice",
        required: true
      });
    const plan = (
      await request(
        "POST",
        `organizations/${org.id}/courses/manifest/validate`,
        manifest,
        owner
      )
    ).json();
    const applied = (
      await request(
        "POST",
        `organizations/${org.id}/courses/manifest/apply`,
        {
          manifest,
          expectedDraftVersionId: plan.expectedDraftVersionId,
          expectedRevision: plan.expectedRevision
        },
        owner
      )
    ).json();
    await request(
      "POST",
      `organizations/${org.id}/courses/${applied.courseId}/versions/${applied.draftVersionId}/publish`,
      {},
      owner
    );
    const o = (
      await request(
        "POST",
        `organizations/${org.id}/offerings`,
        {
          slug,
          name: "Free offering",
          courseVersionId: applied.draftVersionId,
          deliveryMode: "self_paced",
          accessMode: "membership"
        },
        owner,
        201
      )
    ).json();
    const f = {
      org: org.id,
      orgSlug: org.slug,
      offering: o.id,
      version: applied.draftVersionId,
      course: applied.courseId,
      slug,
      manifest
    };
    fixtures.push(f);
    await request(
      "PATCH",
      `organizations/${f.org}/offerings/${f.offering}/visibility`,
      { visibility: "public" },
      owner
    );
    await request(
      "PUT",
      `organizations/${f.org}/customer-entry-policy`,
      { policy },
      owner
    );
    return f;
  }
  async function enrollment(f: Fixture, user = learner) {
    return (
      await migration.query<{ id: string; status: string }>(
        "SELECT id::text,status FROM learning_delivery.enrollments WHERE organization_id=$1 AND offering_id=$2 AND user_id=$3",
        [f.org, f.offering, user]
      )
    ).rows[0];
  }
  // Canonical history fixtures exercise the read policy without inventing quiz execution before Slice D.
  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = origin;
    for (const name of ["Entry owner", "Other learner"])
      users.push(
        (
          await migration.query<{ id: string }>(
            "INSERT INTO identity.users(email,display_name) VALUES($1,$2) RETURNING id",
            [`${randomUUID()}@example.test`, name]
          )
        ).rows[0]!.id
      );
    [owner, foreign] = [users[0]!, users[1]!];
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
    const registered = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      headers: { origin },
      payload: {
        email: `${randomUUID()}@example.test`,
        password: `EntryVerification!${randomUUID()}`,
        displayName: "Own learner",
        consents: currentRegistrationConsents()
      }
    });
    expect(registered.statusCode, registered.body).toBe(201);
    learner = registered.json().id;
    users.push(learner);
    cookie = String(registered.headers["set-cookie"]).split(";")[0]!;
    base = await fixture();
    await join();
    await enroll();
  });
  afterAll(async () => {
    if (app) await app.close();
    for (const org of organizations) {
      for (const table of [
        "events.outbox",
        "learning_history.learning_events",
        "learning_progress.evidence",
        "learning_validation.validation_results",
        "learning_progress.submissions",
        "learning_progress.attempts",
        "learning_progress.mastery_projections",
        "learning_delivery.enrollments",
        "learning_delivery.learning_offerings",
        "learning_content.course_version_lesson_blocks",
        "learning_content.course_version_lessons",
        "learning_content.quiz_validation_configs",
        "learning_content.activity_skill_mappings",
        "learning_content.course_version_activities",
        "learning_content.course_version_skills",
        "learning_content.activities",
        "learning_content.skills",
        "learning_content.courses"
      ])
        await migration.query(`DELETE FROM ${table} WHERE organization_id=$1`, [
          org
        ]);
      await migration.query(
        "DELETE FROM organizations.organizations WHERE id=$1",
        [org]
      );
    }
    await migration.query(
      "DELETE FROM identity.users WHERE id=ANY($1::uuid[])",
      [users]
    );
    await Promise.all([migration.end(), runtime.end()]);
    if (oldOrigin === undefined) delete process.env.WEB_APP_ORIGIN;
    else process.env.WEB_APP_ORIGIN = oldOrigin;
  });

  const single = (optionId = "cpu"): QuizAnswer => ({
    type: "quiz.single_choice",
    optionId
  });
  const multi = (optionIds: string[]): QuizAnswer => ({
    type: "quiz.multiple_choice",
    optionIds
  });
  const short = (text: string): QuizAnswer => ({
    type: "quiz.short_text",
    text
  });
  const check = (
    answer: QuizAnswer,
    key = randomUUID(),
    slug = "components-check",
    f = base,
    actor = learner,
    expected = 200,
    suppliedOrigin = origin
  ) =>
    request(
      "POST",
      `${route(f)}/quiz/${slug}/check`,
      { attemptKey: key, answer },
      actor,
      expected,
      suppliedOrigin
    );
  async function counts(key: string) {
    const row = (
      await migration.query<{
        attempts: number;
        submissions: number;
        results: number;
        evidence: number;
      }>(
        `SELECT (SELECT count(*)::int FROM learning_progress.attempts WHERE id=$1) attempts,
       (SELECT count(*)::int FROM learning_progress.submissions WHERE attempt_id=$1) submissions,
       (SELECT count(*)::int FROM learning_validation.validation_results r JOIN learning_progress.submissions s ON s.id=r.submission_id WHERE s.attempt_id=$1) results,
       (SELECT count(*)::int FROM learning_progress.evidence WHERE attempt_id=$1) evidence`,
        [key]
      )
    ).rows[0]!;
    return row;
  }
  it("computes a trusted canonical result, Evidence and Mastery for a real session role-less learner", async () => {
    const key = randomUUID();
    const response = await check(single(), key);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(quizCheckResultSchema.parse(response.json())).toMatchObject({
      outcome: "passed",
      score: 1,
      attemptNumber: 1
    });
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 1,
      evidence: 1
    });
    const rows = (
      await migration.query(
        `SELECT r.validator_key,r.validator_version,r.validator_config,r.payload,r.evidence_trust,r.recorded_by_user_id,
      e.source_type,e.payload AS normalized,e.score,p.evidence_count,p.mastery_score
      FROM learning_progress.submissions s JOIN learning_validation.validation_results r ON r.submission_id=s.id
      JOIN learning_progress.evidence e ON e.source_validation_result_id=r.id
      JOIN learning_progress.mastery_projections p ON p.organization_id=e.organization_id AND p.user_id=s.submitted_by_user_id AND p.skill_id=e.skill_id WHERE s.attempt_id=$1`,
        [key]
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      validator_key: "quiz.single_choice",
      validator_version: 1,
      validator_config: {},
      payload: {},
      evidence_trust: "trusted",
      recorded_by_user_id: learner,
      source_type: "validation_result",
      normalized: { outcome: "passed" },
      evidence_count: 1
    });
    expect(Number(rows[0].mastery_score)).toBe(1);
    expect((await state()).json().progress).toMatchObject({
      passedRequired: 1,
      totalRequired: 3,
      percentage: 33
    });
    expect(
      (
        await migration.query(
          "SELECT count(*)::int n FROM access_control.role_assignments WHERE organization_id=$1 AND user_id=$2",
          [base.org, learner]
        )
      ).rows[0]!.n
    ).toBe(0);
    expect(response.body).not.toMatch(
      /PRIVATE QUIZ EXPLANATION|correctOption|acceptedAnswers|validatorConfig|explanation|payload|submissionId|activityVersionId/
    );
  });
  it("replays one immutable try without duplicate result, Evidence or lifecycle events", async () => {
    const key = randomUUID();
    const first = (await check(single(), key)).json();
    expect((await check(single(), key)).json()).toEqual(first);
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 1,
      evidence: 1
    });
    const journal = (
      await migration.query(
        "SELECT event_name,count(*)::int n FROM learning_history.learning_events WHERE attempt_id=$1 GROUP BY event_name",
        [key]
      )
    ).rows;
    expect(journal).toHaveLength(4);
    expect(journal.every((r) => r.n === 1)).toBe(true);
    const events = (
      await migration.query(
        "SELECT event_name,count(*)::int n FROM events.outbox WHERE aggregate_id=$1::uuid OR payload->>'attemptId'=$1::text OR payload->>'submissionId'=(SELECT id::text FROM learning_progress.submissions WHERE attempt_id=$1) GROUP BY event_name",
        [key]
      )
    ).rows;
    expect(events).toHaveLength(5);
    expect(events.every((r) => r.n === 1)).toBe(true);
  });
  it("rejects changing a submitted answer under the same retry key", async () => {
    const key = randomUUID();
    await check(single(), key);
    await check(single("ram"), key, "components-check", base, learner, 409);
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 1,
      evidence: 1
    });
  });
  it("a learner retry is a new Attempt and failure does not erase a historical pass", async () => {
    const first = (await check(single())).json();
    const key = randomUUID();
    const failed = (await check(single("ram"), key)).json();
    expect(failed).toMatchObject({
      outcome: "failed",
      score: 0,
      attemptNumber: (first as { attemptNumber: number }).attemptNumber + 1
    });
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 1,
      evidence: 1
    });
    expect((await state()).json().progress.passedRequired).toBe(1);
  });
  it.each([["a"], ["a", "b", "c"]])(
    "multi choice gives no partial credit for %j",
    async (...ids) => {
      expect(
        (await check(multi(ids), randomUUID(), "multi-check")).json()
      ).toMatchObject({ outcome: "failed", score: 0 });
    }
  );
  it("multi choice requires the exact set and canonicalizes selection order for replay", async () => {
    const key = randomUUID();
    const first = (await check(multi(["c", "a"]), key, "multi-check")).json();
    expect(first).toMatchObject({ outcome: "passed", score: 1 });
    expect((await check(multi(["a", "c"]), key, "multi-check")).json()).toEqual(
      first
    );
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 1,
      evidence: 1
    });
  });
  it("short text follows the published NFC/trim/case rule and all passes leave Enrollment active", async () => {
    expect(
      (await check(short(" CAFE\u0301 "), randomUUID(), "text-check")).json()
    ).toMatchObject({ outcome: "passed", score: 1 });
    const stateAfter = (await state()).json();
    expect(stateAfter.progress).toMatchObject({
      percentage: 100,
      allRequiredPassed: true
    });
    expect(stateAfter.entry.enrollmentStatus).toBe("active");
    expect(
      (await check(short("cafe"), randomUUID(), "text-check")).json()
    ).toMatchObject({ outcome: "failed", score: 0 });
  });
  it("rejects duplicate/unknown/mismatched/empty answers before creating learner work", async () => {
    for (const [answer, slug] of [
      [multi(["a", "a"]), "multi-check"],
      [multi(["unknown"]), "multi-check"],
      [single("unknown"), "components-check"],
      [short(" "), "text-check"],
      [short("cpu"), "components-check"]
    ] as const) {
      const key = randomUUID();
      await check(answer, key, slug, base, learner, 400);
      expect(await counts(key)).toEqual({
        attempts: 0,
        submissions: 0,
        results: 0,
        evidence: 0
      });
    }
  });
  it("rejects caller outcome/identity authority, anonymous writes and wrong Origin", async () => {
    const path = `${route(base)}/quiz/components-check/check`,
      key = randomUUID();
    for (const extra of [
      { passed: true },
      { outcome: "passed" },
      { score: 1 },
      { userId: foreign },
      { validatorKey: "manual-review" },
      { submissionId: randomUUID() }
    ])
      await request(
        "POST",
        path,
        { attemptKey: key, answer: single(), ...extra },
        learner,
        400
      );
    await check(single(), key, "components-check", base, "", 401);
    await check(
      single(),
      key,
      "components-check",
      base,
      learner,
      403,
      "https://foreign.example.test"
    );
    expect(await counts(key)).toEqual({
      attempts: 0,
      submissions: 0,
      results: 0,
      evidence: 0
    });
  });
  it("never grants validation.record or allows manual impersonation of computed quiz authority", async () => {
    const key = randomUUID();
    await check(single(), key);
    const submission = (
      await migration.query(
        "SELECT id FROM learning_progress.submissions WHERE attempt_id=$1",
        [key]
      )
    ).rows[0]!.id;
    const path = `organizations/${base.org}/submissions/${submission}/validation-results`;
    const payload = {
      idempotencyKey: randomUUID(),
      status: "completed",
      outcome: "passed",
      score: 1,
      payload: {}
    };
    await request("POST", path, payload, learner, 403);
    await request("POST", path, payload, owner, 409);
  });
  it("cannot use another learner's key or the same key in another enrollment", async () => {
    await join(base, foreign);
    await enroll(base, foreign);
    const key = randomUUID();
    await check(single(), key);
    await check(single(), key, "components-check", base, foreign, 409);
    const other = await fixture("open", "other-free");
    await join(other);
    await enroll(other);
    await check(single(), key, "components-check", other, learner, 409);
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 1,
      evidence: 1
    });
  });
  it("serializes simultaneous identical requests into one canonical try", async () => {
    const key = randomUUID();
    const replies = await Promise.all([
      check(single(), key),
      check(single(), key)
    ]);
    expect(replies[0].json()).toEqual(replies[1].json());
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 1,
      evidence: 1
    });
  });
  it("rolls back work and its journal when submission outbox append fails", async () => {
    const key = randomUUID(),
      outbox = app.get(OutboxRepository),
      original = outbox.append.bind(outbox);
    const spy = vi
      .spyOn(outbox, "append")
      .mockImplementation(async (tx, event) => {
        if (event.eventName === "submission.submitted")
          throw Error("Controlled quiz submission outbox failure");
        return original(tx, event);
      });
    try {
      await check(single(), key, "components-check", base, learner, 500);
    } finally {
      spy.mockRestore();
    }
    expect(await counts(key)).toEqual({
      attempts: 0,
      submissions: 0,
      results: 0,
      evidence: 0
    });
    await check(single(), key);
  });
  it("raw result rollback preserves committed work and same-key replay repairs it", async () => {
    const key = randomUUID(),
      outbox = app.get(OutboxRepository),
      original = outbox.append.bind(outbox);
    const spy = vi
      .spyOn(outbox, "append")
      .mockImplementation(async (tx, event) => {
        if (event.eventName === "validation.result_recorded")
          throw Error("Controlled quiz result outbox failure");
        return original(tx, event);
      });
    try {
      await check(single(), key, "components-check", base, learner, 500);
    } finally {
      spy.mockRestore();
    }
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 0,
      evidence: 0
    });
    await check(single(), key);
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 1,
      evidence: 1
    });
  });
  it("normalization failure preserves raw result and same-key replay repairs Evidence", async () => {
    const key = randomUUID(),
      outbox = app.get(OutboxRepository),
      original = outbox.append.bind(outbox);
    const spy = vi
      .spyOn(outbox, "append")
      .mockImplementation(async (tx, event) => {
        if (event.eventName === "evidence.recorded")
          throw Error("Controlled quiz Evidence outbox failure");
        return original(tx, event);
      });
    try {
      await check(single(), key, "components-check", base, learner, 500);
    } finally {
      spy.mockRestore();
    }
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 1,
      evidence: 0
    });
    await check(single(), key);
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 1,
      evidence: 1
    });
  });
  it("unsupported exact registry binding fails before storing learner work", async () => {
    const key = randomUUID(),
      registry = app.get(ValidatorRegistry),
      original = registry.find.bind(registry);
    const spy = vi
      .spyOn(registry, "find")
      .mockImplementation((key, version) =>
        key.startsWith("quiz.") ? null : original(key, version)
      );
    try {
      await check(single(), key, "components-check", base, learner, 409);
    } finally {
      spy.mockRestore();
    }
    expect(await counts(key)).toEqual({
      attempts: 0,
      submissions: 0,
      results: 0,
      evidence: 0
    });
  });
  it("revalidates access at raw-result stage after work has committed", async () => {
    const f = await fixture();
    await join(f);
    await enroll(f);
    const key = randomUUID();
    const delivery = app.get(FreeLearningDeliveryPort),
      original = delivery.offering.bind(delivery);
    let calls = 0;
    const spy = vi
      .spyOn(delivery, "offering")
      .mockImplementation(async (tx, route, lock) => {
        if (route.offeringId === f.offering && ++calls === 2)
          await migration.query(
            "UPDATE learning_delivery.learning_offerings SET visibility='private' WHERE id=$1",
            [f.offering]
          );
        return original(tx, route, lock);
      });
    try {
      await check(single(), key, "components-check", f, learner, 404);
    } finally {
      spy.mockRestore();
    }
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 0,
      evidence: 0
    });
    await migration.query(
      "UPDATE learning_delivery.learning_offerings SET visibility='public' WHERE id=$1",
      [f.offering]
    );
    await check(single(), key, "components-check", f);
    expect(await counts(key)).toEqual({
      attempts: 1,
      submissions: 1,
      results: 1,
      evidence: 1
    });
  });
  it("unknown activity and terminal enrollment cannot create work", async () => {
    const f = await fixture();
    await join(f);
    await enroll(f);
    const key = randomUUID();
    await check(single(), key, "unknown", f, learner, 404);
    await migration.query(
      "UPDATE learning_delivery.enrollments SET status='withdrawn' WHERE organization_id=$1 AND user_id=$2",
      [f.org, learner]
    );
    await check(single(), key, "components-check", f, learner, 409);
    expect(await counts(key)).toEqual({
      attempts: 0,
      submissions: 0,
      results: 0,
      evidence: 0
    });
  });

  it("moves an Offering forward to a newer version and keeps the learner's Enrollment and progress (ADR-0062)", async () => {
    const f = await fixture("open", "retarget-course");
    await join(f);
    await enroll(f);
    const before = await enrollment(f);
    const passed = quizCheckResultSchema.parse(
      (await check(single("cpu"), randomUUID(), "components-check", f)).json()
    );
    expect(passed.outcome).toBe("passed");
    const first = learnerLearningCourseSchema.parse((await state(f)).json());
    expect(first.progress?.policyVersion).toBe(2);
    expect(first.progress?.passedRequired).toBe(1);

    // Republish the same course as version 2 with a new title.
    await request(
      "POST",
      `organizations/${f.org}/studio/courses/${f.course}/draft`,
      {},
      owner,
      201
    );
    const next = structuredClone(f.manifest);
    next.course.title = "Republished course";
    const plan = (
      await request(
        "POST",
        `organizations/${f.org}/courses/manifest/validate`,
        next,
        owner
      )
    ).json();
    const applied = (
      await request(
        "POST",
        `organizations/${f.org}/courses/manifest/apply`,
        {
          manifest: next,
          expectedDraftVersionId: plan.expectedDraftVersionId,
          expectedRevision: plan.expectedRevision
        },
        owner
      )
    ).json();
    expect(applied.courseId).toBe(f.course);
    const v2 = applied.draftVersionId as string;
    await request(
      "POST",
      `organizations/${f.org}/courses/${f.course}/versions/${v2}/publish`,
      {},
      owner
    );

    const path = `organizations/${f.org}/offerings/${f.offering}/course-version`;
    await request("PATCH", path, { courseVersionId: v2 }, learner, 403);
    await request(
      "PATCH",
      path,
      { courseVersionId: v2, extra: true },
      owner,
      400
    );
    await request("PATCH", path, { courseVersionId: base.version }, owner, 404);
    const moved = (
      await request("PATCH", path, { courseVersionId: v2 }, owner)
    ).json();
    expect(moved.courseVersionId).toBe(v2);
    expect(moved.slug).toBe(f.slug);
    // Idempotent repeat, and never backwards.
    await request("PATCH", path, { courseVersionId: v2 }, owner);
    await request("PATCH", path, { courseVersionId: f.version }, owner, 409);
    const retargeted = await migration.query<{
      payload: Record<string, string>;
    }>(
      "SELECT payload FROM events.outbox WHERE organization_id=$1 AND event_name='learning_offering.retargeted'",
      [f.org]
    );
    expect(retargeted.rows.map((r) => r.payload)).toEqual([
      {
        organizationId: f.org,
        offeringId: f.offering,
        courseId: f.course,
        fromCourseVersionId: f.version,
        toCourseVersionId: v2
      }
    ]);

    // Same Enrollment, new content, earlier pass still counts; new attempts pin version 2.
    expect(await enrollment(f)).toEqual(before);
    const after = learnerLearningCourseSchema.parse((await state(f)).json());
    expect(after.course.title).toBe("Republished course");
    expect(after.progress?.passedRequired).toBe(1);
    expect(
      after.progress?.lessons[0]!.activities.find(
        (a) => a.slug === "components-check"
      )?.passed
    ).toBe(true);
    await check(multi(["a", "c"]), randomUUID(), "multi-check", f);
    const pinned = await migration.query<{ course_version_id: string }>(
      `SELECT av.course_version_id FROM learning_progress.attempts a
         JOIN learning_content.course_version_activities av ON av.id=a.activity_version_id
        WHERE a.organization_id=$1 AND a.enrollment_id=$2 ORDER BY a.created_at DESC LIMIT 1`,
      [f.org, before!.id]
    );
    expect(pinned.rows[0]!.course_version_id).toBe(v2);
    expect(
      learnerLearningCourseSchema.parse((await state(f)).json()).progress
        ?.passedRequired
    ).toBe(2);

    // Cohort Offerings keep their pinned version.
    const cohort = (
      await request(
        "POST",
        `organizations/${f.org}/offerings`,
        {
          slug: "retarget-cohort",
          name: "Cohort",
          courseVersionId: f.version,
          deliveryMode: "cohort",
          accessMode: "membership"
        },
        owner,
        201
      )
    ).json();
    await request(
      "PATCH",
      `organizations/${f.org}/offerings/${cohort.id}/course-version`,
      { courseVersionId: v2 },
      owner,
      409
    );
  });
});
