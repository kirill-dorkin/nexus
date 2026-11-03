import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  courseManifestV1Schema,
  learnerLearningCourseSchema,
  ownLearningListSchema,
  type CourseManifestV1
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
import { FreeLearningDeliveryPort } from "./modules/learning-delivery/application/free-learning-delivery.port";
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
describe("free learner entry HTTP + PostgreSQL boundary", () => {
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
    manifest.activities.push(
      { ...first, slug: "second-task", title: "Second task" },
      { ...first, slug: "optional-task", title: "Optional task" }
    );
    manifest.lessons[0]!.blocks.push({
      type: "activity",
      activitySlug: "optional-task",
      kind: "practice",
      required: false
    });
    manifest.lessons.push(
      {
        slug: "next-lesson",
        title: "Next",
        summary: "",
        durationMinutes: 1,
        blocks: [
          {
            type: "activity",
            activitySlug: "second-task",
            kind: "practice",
            required: true
          }
        ]
      },
      {
        slug: "information",
        title: "Information",
        summary: "",
        durationMinutes: 1,
        blocks: [{ type: "markdown", markdown: "Read only" }]
      }
    );
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
  async function events(f: Fixture) {
    return (
      await migration.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM events.outbox WHERE organization_id=$1 AND event_name='enrollment.created'",
        [f.org]
      )
    ).rows[0]!.n;
  }
  // Canonical history fixtures exercise the read policy without inventing quiz execution before Slice D.
  async function observation(
    f: Fixture,
    slug: string,
    outcome: "passed" | "failed" | "needs_review" | null,
    trust = "trusted",
    normalized = true,
    user = learner
  ) {
    const e = await enrollment(f, user);
    if (!e) throw Error("Fixture enrollment required");
    const a = (
      await migration.query<{
        id: string;
        activity_type: string;
        skill_id: string;
      }>(
        `SELECT a.id,a.activity_type,m.skill_id FROM learning_content.course_version_activities a JOIN learning_content.activity_skill_mappings m ON m.organization_id=a.organization_id AND m.course_version_id=a.course_version_id AND m.activity_id=a.activity_id WHERE a.organization_id=$1 AND a.course_version_id=$2 AND a.slug=$3 LIMIT 1`,
        [f.org, f.version, slug]
      )
    ).rows[0]!;
    const attempt = (
      await migration.query<{ id: string }>(
        `INSERT INTO learning_progress.attempts(organization_id,enrollment_id,activity_version_id,attempt_number) SELECT $1,$2,$3,coalesce(max(attempt_number),0)+1 FROM learning_progress.attempts WHERE enrollment_id=$2 AND activity_version_id=$3 RETURNING id`,
        [f.org, e.id, a.id]
      )
    ).rows[0]!.id;
    const submission = (
      await migration.query<{ id: string }>(
        "INSERT INTO learning_progress.submissions(organization_id,attempt_id,payload,submitted_by_user_id) VALUES($1,$2,'{}',$3) RETURNING id",
        [f.org, attempt, user]
      )
    ).rows[0]!.id;
    const result = (
      await migration.query<{ id: string }>(
        `INSERT INTO learning_validation.validation_results(organization_id,submission_id,activity_version_id,validator_key,validator_version,idempotency_key,status,outcome,score,evidence_trust,payload,recorded_by_user_id) VALUES($1,$2,$3,'fixture.history',1,$4,$5,$6,$7,$8,'{}',$9) RETURNING id`,
        [
          f.org,
          submission,
          a.id,
          randomUUID(),
          outcome === null ? "system_error" : "completed",
          outcome,
          outcome === "passed" ? 1 : outcome === "failed" ? 0 : null,
          trust,
          owner
        ]
      )
    ).rows[0]!.id;
    if (
      normalized &&
      trust === "trusted" &&
      (outcome === "passed" || outcome === "failed")
    )
      await migration.query(
        `INSERT INTO learning_progress.evidence(organization_id,attempt_id,submission_id,skill_id,kind,score,payload,source_type,source_validation_result_id) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,'validation_result',$8)`,
        [
          f.org,
          attempt,
          submission,
          a.skill_id,
          a.activity_type,
          outcome === "passed" ? 1 : 0,
          JSON.stringify({ outcome }),
          result
        ]
      );
    return { attempt, submission, a };
  }
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
        displayName: "Own learner"
      }
    });
    expect(registered.statusCode, registered.body).toBe(201);
    learner = registered.json().id;
    users.push(learner);
    cookie = String(registered.headers["set-cookie"]).split(";")[0]!;
    base = await fixture();
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
  it("uses the real session and keeps public reading independent of entry", async () => {
    expect((await state()).json().entry).toMatchObject({
      membershipStatus: "none",
      enrollmentStatus: null
    });
    await enroll(base, learner, 409);
    expect(await enrollment(base)).toBeUndefined();
    await state(base, "", 401);
    await request("GET", "me/learning", undefined, "", 401);
    expect(
      (
        await request(
          "GET",
          `public/learning/${base.orgSlug}/${base.slug}`,
          undefined,
          ""
        )
      ).json().course.title
    ).toBe(base.manifest.course.title);
  });
  it("creates role-less own membership separately, then an idempotent own free enrollment", async () => {
    await join();
    expect(await enrollment(base)).toBeUndefined();
    await join();
    const first = learnerLearningCourseSchema.parse((await enroll()).json());
    expect(first.entry).toMatchObject({
      membershipStatus: "active",
      enrollmentStatus: "active"
    });
    expect(first.progress).toMatchObject({
      passedRequired: 0,
      totalRequired: 2,
      percentage: 0
    });
    await enroll();
    expect(await events(base)).toBe(1);
    const roles = await migration.query(
      "SELECT * FROM access_control.role_assignments WHERE organization_id=$1 AND user_id=$2",
      [base.org, learner]
    );
    expect(roles.rows).toEqual([]);
    const rights = await migration.query(
      "SELECT * FROM commerce.entitlements WHERE organization_id=$1 AND user_id=$2",
      [base.org, learner]
    );
    expect(rights.rows).toEqual([]);
  });
  it("rejects caller-owned identity and exact-Origin violations", async () => {
    for (const key of [
      "userId",
      "offeringId",
      "organizationId",
      "status",
      "roleKey"
    ])
      await enroll(base, learner, 400, { [key]: foreign });
    await request(
      "POST",
      `${route(base)}/enrollment`,
      {},
      learner,
      403,
      "https://evil.example.test"
    );
    await enroll(base, "", 401);
    expect(await events(base)).toBe(1);
    await request(
      "POST",
      `organizations/${base.org}/offerings/${base.offering}/enrollments`,
      { userId: foreign },
      learner,
      403
    );
  });
  it("serializes simultaneous first enrollment and writes one event", async () => {
    const f = await fixture();
    await join(f);
    await Promise.all([enroll(f), enroll(f), enroll(f)]);
    expect(await events(f)).toBe(1);
    expect(
      (
        await migration.query(
          "SELECT id FROM learning_delivery.enrollments WHERE offering_id=$1 AND user_id=$2",
          [f.offering, learner]
        )
      ).rows
    ).toHaveLength(1);
  });
  it("rolls back enrollment when canonical outbox append fails", async () => {
    const f = await fixture();
    await join(f);
    const spy = vi
      .spyOn(app.get(OutboxRepository), "append")
      .mockRejectedValueOnce(Error("Controlled enrollment outbox failure"));
    try {
      await enroll(f, learner, 500);
    } finally {
      spy.mockRestore();
    }
    expect(await enrollment(f)).toBeUndefined();
    expect(await events(f)).toBe(0);
    await enroll(f);
    expect(await events(f)).toBe(1);
  });
  it("closed self-entry does not revoke an already active member", async () => {
    const f = await fixture("closed");
    await join(f, learner, 404);
    await request(
      "PUT",
      `organizations/${f.org}/customer-entry-policy`,
      { policy: "open" },
      owner
    );
    await join(f);
    await request(
      "PUT",
      `organizations/${f.org}/customer-entry-policy`,
      { policy: "closed" },
      owner
    );
    await enroll(f);
  });
  it.each(["invited", "suspended", "left"])(
    "fails closed for %s membership without reactivation",
    async (status) => {
      const f = await fixture();
      await migration.query(
        "INSERT INTO organizations.memberships(organization_id,user_id,status) VALUES($1,$2,$3)",
        [f.org, learner, status]
      );
      await enroll(f, learner, 409);
      expect((await state(f)).json()).toMatchObject({
        entry: { membershipStatus: status },
        progress: null
      });
      expect(await enrollment(f)).toBeUndefined();
    }
  );
  it.each([
    ["visibility", "private"],
    ["status", "closed"],
    ["status", "archived"],
    ["access_mode", "entitlement_required"]
  ])(
    "denies current Offering %s=%s despite previous public reads",
    async (column, value) => {
      const f = await fixture();
      await join(f);
      await state(f);
      await migration.query(
        `UPDATE learning_delivery.learning_offerings SET ${column}=$2 WHERE id=$1`,
        [f.offering, value]
      );
      await enroll(f, learner, 404);
      await state(f, learner, 404);
      expect(await enrollment(f)).toBeUndefined();
    }
  );
  it("revalidates Offering after a concurrently queued withdrawal", async () => {
    const f = await fixture();
    await join(f);
    const client = await migration.connect();
    await client.query("BEGIN");
    await client.query(
      "SELECT id FROM learning_delivery.learning_offerings WHERE id=$1 FOR UPDATE",
      [f.offering]
    );
    const port = app.get(FreeLearningDeliveryPort),
      original = port.offering.bind(port);
    let reached!: () => void;
    const ready = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const spy = vi
      .spyOn(port, "offering")
      .mockImplementationOnce(async (...args) => {
        reached();
        return original(...args);
      });
    try {
      const pending = enroll(f, learner, 404);
      await ready;
      await client.query(
        "UPDATE learning_delivery.learning_offerings SET visibility='private' WHERE id=$1",
        [f.offering]
      );
      await client.query("COMMIT");
      await pending;
    } finally {
      spy.mockRestore();
      await client.query("ROLLBACK");
      client.release();
    }
    expect(await enrollment(f)).toBeUndefined();
    expect(await events(f)).toBe(0);
  });
  it("denies a separately created cohort Offering and inactive Organization/Course", async () => {
    const f = await fixture();
    await join(f);
    const cohort = (
      await request(
        "POST",
        `organizations/${f.org}/offerings`,
        {
          slug: "cohort-only",
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
      `organizations/${f.org}/offerings/${cohort.id}/visibility`,
      { visibility: "public" },
      owner
    );
    await request(
      "POST",
      `me/learning/${f.orgSlug}/cohort-only/enrollment`,
      {},
      learner,
      404
    );
    await migration.query(
      "UPDATE learning_content.courses SET status='archived' WHERE id=$1",
      [f.course]
    );
    await enroll(f, learner, 404);
    await migration.query(
      "UPDATE learning_content.courses SET status='active' WHERE id=$1",
      [f.course]
    );
    await migration.query(
      "UPDATE organizations.organizations SET status='suspended' WHERE id=$1",
      [f.org]
    );
    await enroll(f, learner, 404);
  });
  it("returns only own exact Enrollment passes and hides all private author/result state", async () => {
    await join(base, foreign);
    await enroll(base, foreign);
    await observation(
      base,
      base.manifest.activities[0]!.slug,
      "passed",
      "trusted",
      true,
      foreign
    );
    expect((await state()).json().progress.passedRequired).toBe(0);
    const manual = await observation(
      base,
      base.manifest.activities[0]!.slug,
      "passed",
      "trusted",
      false
    );
    await migration.query(
      `INSERT INTO learning_progress.evidence(organization_id,attempt_id,submission_id,skill_id,kind,score,payload,recorded_by_user_id)
       VALUES($1,$2,$3,$4,$5,1,'{"outcome":"passed"}'::jsonb,$6)`,
      [
        base.org,
        manual.attempt,
        manual.submission,
        manual.a.skill_id,
        manual.a.activity_type,
        owner
      ]
    );
    expect((await state()).json().progress.passedRequired).toBe(0);
    await observation(
      base,
      base.manifest.activities[0]!.slug,
      "passed",
      "advisory",
      false
    );
    await observation(
      base,
      base.manifest.activities[0]!.slug,
      "needs_review",
      "trusted",
      false
    );
    await observation(
      base,
      base.manifest.activities[0]!.slug,
      null,
      "trusted",
      false
    );
    await observation(
      base,
      base.manifest.activities[0]!.slug,
      "passed",
      "trusted",
      false
    );
    expect((await state()).json().progress.passedRequired).toBe(0);
    await observation(base, "optional-task", "passed");
    expect((await state()).json().progress.passedRequired).toBe(0);
    await observation(base, base.manifest.activities[0]!.slug, "failed");
    expect((await state()).json().progress.passedRequired).toBe(0);
    await observation(base, base.manifest.activities[0]!.slug, "passed");
    const passed = (await state()).json();
    expect(passed.progress).toMatchObject({
      passedRequired: 1,
      totalRequired: 2,
      percentage: 50,
      nextLessonSlug: "next-lesson"
    });
    await observation(base, base.manifest.activities[0]!.slug, "failed");
    expect((await state()).json().progress.passedRequired).toBe(1);
    await observation(base, "second-task", "passed");
    const complete = learnerLearningCourseSchema.parse((await state()).json());
    expect(complete.progress).toMatchObject({
      allRequiredPassed: true,
      percentage: 100,
      nextLessonSlug: null
    });
    expect((await enrollment(base))!.status).toBe("active");
    const serialized = JSON.stringify(complete);
    for (const key of [
      "validatorConfig",
      "correctOptionId",
      "correctOptionIds",
      "acceptedAnswers",
      "explanation",
      "recordedByUserId",
      "userId",
      "activityVersionId",
      "organizationId"
    ])
      expect(serialized).not.toContain(`"${key}"`);
    expect(
      complete.progress!.lessons.find((l) => l.slug === "information")!
        .requiredPassed
    ).toBe(false);
  });
  it("never applies passes to another enrollment of the same release or a newer draft", async () => {
    const other = (
      await request(
        "POST",
        `organizations/${base.org}/offerings`,
        {
          slug: "same-release",
          name: "Same release",
          courseVersionId: base.version,
          deliveryMode: "self_paced",
          accessMode: "membership"
        },
        owner,
        201
      )
    ).json();
    await request(
      "PATCH",
      `organizations/${base.org}/offerings/${other.id}/visibility`,
      { visibility: "public" },
      owner
    );
    const state = await request(
      "POST",
      `me/learning/${base.orgSlug}/same-release/enrollment`,
      {},
      learner
    );
    expect(state.json().progress.passedRequired).toBe(0);
    await request(
      "POST",
      `organizations/${base.org}/courses/${base.course}/versions`,
      { title: "New private draft" },
      owner,
      201
    );
    expect((await request("GET", route(base))).json().progress.percentage).toBe(
      100
    );
  });
  it("paginates only own memberships and rejects foreign actor query input", async () => {
    const own = ownLearningListSchema.parse(
      (await request("GET", "me/learning")).json()
    );
    expect(own.courses.some((c) => c.organization.slug === base.orgSlug)).toBe(
      true
    );
    await request(
      "GET",
      `me/learning?userId=${foreign}`,
      undefined,
      learner,
      400
    );
    const end = ownLearningListSchema.parse(
      (
        await request(
          "GET",
          "me/learning?after=ffffffff-ffff-4fff-bfff-ffffffffffff"
        )
      ).json()
    );
    expect(end.courses).toEqual([]);
    expect(end.nextCursor).toBeNull();
    const outsider = ownLearningListSchema.parse(
      (await request("GET", "me/learning", undefined, owner)).json()
    );
    expect(outsider.courses).toEqual([]);
  });
  it.each(["withdrawn", "cancelled", "completed"])(
    "preserves terminal Enrollment %s",
    async (status) => {
      const f = await fixture();
      await join(f);
      await enroll(f);
      await migration.query(
        `UPDATE learning_delivery.enrollments SET status=$2,completed_at=CASE WHEN $2='completed' THEN now() ELSE NULL END WHERE offering_id=$1`,
        [f.offering, status]
      );
      await enroll(f, learner, status === "completed" ? 200 : 409);
      expect((await enrollment(f))!.status).toBe(status);
      expect(await events(f)).toBe(1);
    }
  );
  it("actor capabilities fail closed without a principal and RLS stays tenant-scoped", async () => {
    expect(
      (
        await runtime.query(
          "SELECT * FROM learning_delivery.resolve_free_learning_actor_route($1,$2)",
          [base.orgSlug, base.slug]
        )
      ).rows
    ).toEqual([]);
    expect(
      (
        await runtime.query(
          "SELECT * FROM learning_delivery.list_own_free_learning_addresses(NULL)"
        )
      ).rows
    ).toEqual([]);
    expect(
      (await runtime.query("SELECT * FROM learning_delivery.enrollments")).rows
    ).toEqual([]);
  });
  it("keyset pagination covers more than 100 own courses without duplicates", async () => {
    const f = await fixture();
    await join(f);
    await migration.query(
      `INSERT INTO learning_delivery.learning_offerings(organization_id,course_version_id,slug,name,delivery_mode,access_mode,visibility,created_by_user_id)
     SELECT $1,$2,'paged-'||n,'Paged free course','self_paced','membership','public',$3 FROM generate_series(1,101) n`,
      [f.org, f.version, owner]
    );
    await migration.query(
      `INSERT INTO learning_delivery.enrollments(organization_id,offering_id,user_id,created_by_user_id)
     SELECT organization_id,id,$2,$2 FROM learning_delivery.learning_offerings WHERE organization_id=$1 AND slug LIKE 'paged-%'`,
      [f.org, learner]
    );
    const first = ownLearningListSchema.parse(
      (await request("GET", "me/learning")).json()
    );
    expect(first.courses).toHaveLength(100);
    expect(first.nextCursor).not.toBeNull();
    const second = ownLearningListSchema.parse(
      (await request("GET", `me/learning?after=${first.nextCursor}`)).json()
    );
    const keys = [...first.courses, ...second.courses].map(
      (c) => `${c.organization.slug}/${c.offering.slug}`
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(
      keys.filter((k) => k.startsWith(f.orgSlug + "/paged-"))
    ).toHaveLength(101);
    expect(second.nextCursor).toBeNull();
  });
  it("inactive identity cannot enroll or read saved learning", async () => {
    await migration.query(
      "UPDATE identity.users SET status='suspended' WHERE id=$1",
      [foreign]
    );
    await state(base, foreign, 403);
    await enroll(base, foreign, 403);
    await request("GET", "me/learning", undefined, foreign, 403);
  });
});
