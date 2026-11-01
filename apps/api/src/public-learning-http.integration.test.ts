import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  courseManifestV1Schema,
  learningOfferingListSchema,
  publicLearningCatalogSchema,
  publicLearningCourseSchema,
  publicLearningLessonSchema,
  type CourseManifestV1
} from "@platform/contracts";
import { createDatabasePool, withTenantTransaction } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestOrganization } from "./test-support/create-test-organization";
import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";
import { OutboxRepository } from "./outbox/outbox.repository";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} required.`);
  return value;
}
describe("public free learning HTTP + PostgreSQL boundary", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL"));
  const runtime = createDatabasePool(env("DATABASE_URL"));
  const oldOrigin = process.env.WEB_APP_ORIGIN;
  const origin = "https://learning.example.test";
  const users: string[] = [];
  const organizations: string[] = [];
  const fixtures: {
    org: string;
    orgSlug: string;
    course: string;
    version: string;
    offering: string;
    manifest: CourseManifestV1;
  }[] = [];
  let app: NestFastifyApplication;
  let owner = "";
  let learner = "";
  const offeringSlug = "public-computer-basics";
  const lessonSlug = "computer-introduction";
  async function post(
    path: string,
    payload: object,
    user = owner,
    expected = 200
  ) {
    const r = await app.inject({
      method: "POST",
      url: `/v1/${path}`,
      headers: { origin, "x-test-user-id": user },
      payload
    });
    expect(r.statusCode, r.body).toBe(expected);
    return r.body ? r.json() : null;
  }
  async function visibility(
    f = fixtures[0]!,
    value = "public",
    user = owner,
    suppliedOrigin = origin,
    expected = 200
  ) {
    const r = await app.inject({
      method: "PATCH",
      url: `/v1/organizations/${f.org}/offerings/${f.offering}/visibility`,
      headers: { "x-test-user-id": user, origin: suppliedOrigin },
      payload: { visibility: value }
    });
    expect(r.statusCode, r.body).toBe(expected);
    return r;
  }
  async function get(f = fixtures[0]!, suffix = "", expected = 200) {
    const r = await app.inject({
      method: "GET",
      url: `/v1/public/learning/${f.orgSlug}/${offeringSlug}${suffix}`
    });
    expect(r.statusCode, r.body).toBe(expected);
    return r;
  }
  async function events(f = fixtures[0]!) {
    return (
      await migration.query(
        "SELECT count(*)::int AS n FROM events.outbox WHERE organization_id=$1 AND event_name='learning_offering.visibility_changed'",
        [f.org]
      )
    ).rows[0]!.n;
  }
  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = origin;
    for (const name of ["Public author", "Public learner"])
      users.push(
        (
          await migration.query<{ id: string }>(
            "INSERT INTO identity.users(email,display_name) VALUES($1,$2) RETURNING id::text",
            [`${randomUUID()}@example.test`, name]
          )
        ).rows[0]!.id
      );
    [owner, learner] = [users[0]!, users[1]!];
    app = await createApiApplication();
    app
      .getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (request) => {
        const user = request.headers["x-test-user-id"];
        if (typeof user === "string" && user)
          attachPlatformPrincipal(request as PlatformPrincipalCarrier, {
            userId: user
          });
      });
    await app.init();
    for (let i = 0; i < 2; i++) {
      const organization = await createTestOrganization(migration, owner, {
        slug: `public-learn-${randomUUID()}`, name: `Public academy ${i}`
      });
      organizations.push(organization.id);
      const manifest = courseManifestV1Schema.parse(
        JSON.parse(
          readFileSync("docs/examples/computer-basics.manifest.json", "utf8")
        )
      );
      manifest.course.title = `Public course ${i}`;
      manifest.lessons[0]!.chapter = "Введение";
      manifest.activities[0]!.validation.explanation =
        "PRIVATE_EXPLANATION_SENTINEL";
      manifest.activities.push(
        {
          slug: "multi-check",
          title: "Multiple choice",
          type: "quiz.multiple_choice",
          instructions: "",
          skillKeys: [manifest.skills[0]!.key],
          presentation: {
            question: "Which?",
            options: [
              { id: "a", text: "A" },
              { id: "b", text: "B" }
            ]
          },
          validation: {
            correctOptionIds: ["a"],
            explanation: "PRIVATE_MULTIPLE"
          }
        },
        {
          slug: "text-check",
          title: "Short text",
          type: "quiz.short_text",
          instructions: "",
          skillKeys: [manifest.skills[0]!.key],
          presentation: { question: "What?" },
          validation: {
            acceptedAnswers: ["PRIVATE_ACCEPTED_SENTINEL"],
            caseSensitive: false,
            explanation: "PRIVATE_TEXT"
          }
        }
      );
      manifest.lessons[0]!.blocks.push(
        {
          type: "activity",
          activitySlug: "multi-check",
          kind: "homework",
          required: true
        },
        {
          type: "activity",
          activitySlug: "text-check",
          kind: "practice",
          required: false
        }
      );
      manifest.lessons.push({
        slug: "second-lesson",
        title: "Second lesson",
        summary: "Next",
        durationMinutes: 5,
        blocks: [{ type: "markdown", markdown: `Second academy ${i}` }]
      });
      const plan = await post(
        `organizations/${organization.id}/courses/manifest/validate`,
        manifest
      );
      const applied = await post(
        `organizations/${organization.id}/courses/manifest/apply`,
        {
          manifest,
          expectedDraftVersionId: plan.expectedDraftVersionId,
          expectedRevision: plan.expectedRevision
        }
      );
      await post(
        `organizations/${organization.id}/courses/${applied.courseId}/versions/${applied.draftVersionId}/publish`,
        {}
      );
      const offering = await post(
        `organizations/${organization.id}/offerings`,
        {
          courseVersionId: applied.draftVersionId,
          slug: offeringSlug,
          name: "Free public learning",
          deliveryMode: "self_paced",
          accessMode: "membership"
        },
        owner,
        201
      );
      expect(offering.visibility).toBe("private");
      fixtures.push({
        org: organization.id,
        orgSlug: organization.slug,
        course: applied.courseId,
        version: applied.draftVersionId,
        offering: offering.id,
        manifest
      });
    }
    await post(
      `organizations/${fixtures[0]!.org}/memberships`,
      { userId: learner },
      owner,
      201
    );
    await post(
      `organizations/${fixtures[0]!.org}/memberships/me/accept`,
      {},
      learner
    );
    await post(
      `organizations/${fixtures[0]!.org}/role-assignments`,
      {
        userId: learner,
        roleKey: "learner",
        scope: { type: "organization", id: fixtures[0]!.org }
      },
      owner,
      204
    );
  });
  afterAll(async () => {
    if (app) await app.close();
    for (const org of organizations) {
      for (const table of [
        "events.outbox",
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

  it("lists published-release Offerings only to the authorized course manager", async () => {
    const f = fixtures[0]!;
    const another = await post(
      `organizations/${f.org}/offerings`,
      {
        courseVersionId: f.version,
        slug: `second-offering-${randomUUID()}`,
        name: "Another private Offering",
        deliveryMode: "self_paced",
        accessMode: "membership"
      },
      owner,
      201
    );
    const url = `/v1/organizations/${f.org}/offerings?courseVersionId=${f.version}`;
    const ownerRead = await app.inject({
      method: "GET",
      url,
      headers: { "x-test-user-id": owner }
    });
    expect(ownerRead.statusCode, ownerRead.body).toBe(200);
    expect(ownerRead.headers["cache-control"]).toBe("no-store");
    const list = learningOfferingListSchema.parse(ownerRead.json());
    expect(list.nextCursor).toBeNull();
    expect(list.offerings.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([f.offering, another.id])
    );
    expect(list.offerings.every((entry) =>
      entry.organizationId === f.org && entry.courseVersionId === f.version
    )).toBe(true);
    expect(list.offerings.find((entry) => entry.id === another.id)?.visibility).toBe("private");

    for (const [user, expected] of [["", 401], [learner, 403]] as const) {
      const response = await app.inject({
        method: "GET",
        url,
        headers: user ? { "x-test-user-id": user } : {}
      });
      expect(response.statusCode, response.body).toBe(expected);
      expect(response.body).not.toContain(another.id);
    }
    const foreign = await app.inject({
      method: "GET",
      url: `/v1/organizations/${f.org}/offerings?courseVersionId=${fixtures[1]!.version}`,
      headers: { "x-test-user-id": owner }
    });
    expect(foreign.statusCode, foreign.body).toBe(404);
    for (const suffix of ["?courseVersionId=wrong", `?courseVersionId=${f.version}&extra=true`, `?courseVersionId=${f.version}&after=wrong`]) {
      const malformed = await app.inject({
        method: "GET",
        url: `/v1/organizations/${f.org}/offerings${suffix}`,
        headers: { "x-test-user-id": owner }
      });
      expect(malformed.statusCode, malformed.body).toBe(400);
    }
  });

  it("paginates the authorized Offering list without truncating or repeating entries", async () => {
    const f = fixtures[1]!;
    const expectedIds = new Set<string>([f.offering]);
    for (let i = 0; i < 50; i++) {
      const offering = await post(
        `organizations/${f.org}/offerings`,
        {
          courseVersionId: f.version,
          slug: `paged-offering-${i}-${randomUUID()}`,
          name: `Private page fixture ${i}`,
          deliveryMode: "self_paced",
          accessMode: "membership"
        },
        owner,
        201
      );
      expectedIds.add(offering.id);
    }
    const base = `/v1/organizations/${f.org}/offerings?courseVersionId=${f.version}`;
    const fetchPage = async (after?: string) => {
      const response = await app.inject({
        method: "GET",
        url: after ? `${base}&after=${after}` : base,
        headers: { "x-test-user-id": owner }
      });
      expect(response.statusCode, response.body).toBe(200);
      expect(response.headers["cache-control"]).toBe("no-store");
      return learningOfferingListSchema.parse(response.json());
    };
    const first = await fetchPage();
    expect(first.offerings).toHaveLength(50);
    expect(first.nextCursor).toBe(first.offerings.at(-1)!.id);
    const second = await fetchPage(first.nextCursor!);
    expect(second.offerings).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    const all = [...first.offerings, ...second.offerings];
    expect(new Set(all.map((offering) => offering.id))).toEqual(expectedIds);
    expect(all.every((offering) =>
      offering.organizationId === f.org &&
      offering.courseVersionId === f.version &&
      offering.visibility === "private"
    )).toBe(true);
  });

  it("defaults private and never exposes private content through anonymous functions", async () => {
    await get(fixtures[0], "", 404);
    await get(fixtures[0], `/lessons/${lessonSlug}`, 404);
    const r = await runtime.query(
      "SELECT learning_content.read_public_learning_course($1,$2) AS content",
      [fixtures[0]!.orgSlug, offeringSlug]
    );
    expect(r.rows[0]!.content).toBeNull();
    const catalog = publicLearningCatalogSchema.parse(
      (await app.inject({ method: "GET", url: "/v1/public/learning" })).json()
    );
    expect(
      catalog.courses.some((c) => c.organization.slug === fixtures[0]!.orgSlug)
    ).toBe(false);
  });
  it("visibility requires manage authority, session, exact Origin and tenant relationship", async () => {
    await visibility(fixtures[0], "public", "", origin, 401);
    await visibility(fixtures[0], "public", learner, origin, 403);
    await visibility(fixtures[1], "public", learner, origin, 403);
    await visibility(
      fixtures[0],
      "public",
      owner,
      "https://foreign.example.test",
      403
    );
    await visibility(fixtures[0], "all", owner, origin, 400);
    expect(await events()).toBe(0);
  });
  it("opts in atomically, emits one event and duplicate intent is idempotent", async () => {
    await visibility();
    await visibility();
    expect(await events()).toBe(1);
    const event = (
      await migration.query(
        "SELECT payload FROM events.outbox WHERE organization_id=$1 AND event_name='learning_offering.visibility_changed'",
        [fixtures[0]!.org]
      )
    ).rows[0]!.payload;
    expect(event).toEqual({
      organizationId: fixtures[0]!.org,
      offeringId: fixtures[0]!.offering,
      visibility: "public"
    });
  });
  it("anonymous DTOs include ordered lessons and all safe quiz shapes without answer/binding/internal state", async () => {
    const r = await get();
    expect(r.headers["cache-control"]).toBe("no-store");
    const course = publicLearningCourseSchema.parse(r.json());
    expect(course.course.lessons.map((l) => l.slug)).toEqual([
      lessonSlug,
      "second-lesson"
    ]);
    // Chapter is projected when set and absent otherwise (ADR-0063).
    expect(course.course.lessons.map((l) => l.chapter)).toEqual(["Введение", undefined]);
    const lesson = publicLearningLessonSchema.parse(
      (await get(fixtures[0], `/lessons/${lessonSlug}`)).json()
    );
    expect(lesson.lesson.blocks.map((b) => b.type)).toEqual([
      "youtube",
      "markdown",
      "activity",
      "activity",
      "activity"
    ]);
    for (const secret of [
      "correctOptionId",
      "correctOptionIds",
      "acceptedAnswers",
      "PRIVATE_EXPLANATION",
      "PRIVATE_ACCEPTED",
      "PRIVATE_MULTIPLE",
      "PRIVATE_TEXT",
      "validatorKey",
      "courseVersionId",
      "organizationId",
      "createdByUserId",
      fixtures[0]!.org,
      fixtures[0]!.version
    ])
      expect(JSON.stringify(lesson)).not.toContain(secret);
    expect(lesson.lesson.blocks[2]).toMatchObject({
      activity: {
        options: [
          { id: "cpu", text: "Процессор" },
          { id: "ram", text: "Оперативная память" }
        ]
      }
    });
    expect(
      (
        await migration.query(
          "SELECT count(*)::int AS n FROM learning_delivery.enrollments WHERE organization_id=ANY($1::uuid[])",
          [organizations]
        )
      ).rows[0]!.n
    ).toBe(0);
  });
  it("same offering/lesson slug in another tenant returns only that tenant's public release", async () => {
    await visibility(fixtures[1]);
    expect(
      publicLearningCourseSchema.parse((await get(fixtures[1])).json()).course
        .title
    ).toBe("Public course 1");
    const catalog = publicLearningCatalogSchema.parse(
      (await app.inject({ method: "GET", url: "/v1/public/learning" })).json()
    );
    expect(
      catalog.courses.filter((c) =>
        organizations.includes(
          fixtures.find((f) => f.orgSlug === c.organization.slug)?.org ?? ""
        )
      ).length
    ).toBe(2);
    await get(fixtures[0], "/lessons/unknown-lesson", 404);
    const unknown = await app.inject({
      method: "GET",
      url: `/v1/public/learning/unknown-organization/${offeringSlug}`
    });
    expect(unknown.statusCode).toBe(404);
  });
  it.each([
    ["visibility", "private"],
    ["status", "closed"],
    ["status", "archived"],
    ["access_mode", "entitlement_required"]
  ])("fails closed immediately for %s=%s", async (column, value) => {
    const f = fixtures[0]!;
    const before = (
      await migration.query(
        `SELECT ${column} AS value FROM learning_delivery.learning_offerings WHERE id=$1`,
        [f.offering]
      )
    ).rows[0]!.value;
    try {
      await migration.query(
        `UPDATE learning_delivery.learning_offerings SET ${column}=$2 WHERE id=$1`,
        [f.offering, value]
      );
      await get(f, "", 404);
      await get(f, `/lessons/${lessonSlug}`, 404);
      const catalog = publicLearningCatalogSchema.parse(
        (await app.inject({ method: "GET", url: "/v1/public/learning" })).json()
      );
      expect(
        catalog.courses.some((c) => c.organization.slug === f.orgSlug)
      ).toBe(false);
      expect(
        (
          await runtime.query(
            "SELECT learning_content.read_public_learning_lesson($1,$2,$3) AS content",
            [f.orgSlug, offeringSlug, lessonSlug]
          )
        ).rows[0]!.content
      ).toBeNull();
    } finally {
      await migration.query(
        `UPDATE learning_delivery.learning_offerings SET ${column}=$2 WHERE id=$1`,
        [f.offering, before]
      );
    }
  });
  it("a separately created cohort Offering cannot expose public course or lesson material", async () => {
    const f = fixtures[0]!;
    const slug = "cohort-computer-basics";
    const offering = await post(
      `organizations/${f.org}/offerings`,
      {
        courseVersionId: f.version,
        slug,
        name: "Cohort learning",
        deliveryMode: "cohort",
        accessMode: "membership"
      },
      owner,
      201
    );
    await visibility({ ...f, offering: offering.id });
    for (const suffix of ["", `/lessons/${lessonSlug}`]) {
      const r = await app.inject({
        method: "GET",
        url: `/v1/public/learning/${f.orgSlug}/${slug}${suffix}`
      });
      expect(r.statusCode, r.body).toBe(404);
    }
    const catalog = publicLearningCatalogSchema.parse(
      (await app.inject({ method: "GET", url: "/v1/public/learning" })).json()
    );
    expect(
      catalog.courses.some(
        (c) => c.organization.slug === f.orgSlug && c.offering.slug === slug
      )
    ).toBe(false);
  });

  it("inactive Organization and archived Course cannot expose published content", async () => {
    const f = fixtures[0]!;
    try {
      await migration.query(
        "UPDATE organizations.organizations SET status='suspended' WHERE id=$1",
        [f.org]
      );
      await get(f, "", 404);
      await get(f, `/lessons/${lessonSlug}`, 404);
    } finally {
      await migration.query(
        "UPDATE organizations.organizations SET status='active' WHERE id=$1",
        [f.org]
      );
    }
    try {
      await migration.query(
        "UPDATE learning_content.courses SET status='archived' WHERE id=$1",
        [f.course]
      );
      await get(f, "", 404);
      await get(f, `/lessons/${lessonSlug}`, 404);
    } finally {
      await migration.query(
        "UPDATE learning_content.courses SET status='active' WHERE id=$1",
        [f.course]
      );
    }
  });
  it("a stable course address resolves the Offering that publicly serves the course slug", async () => {
    const f = fixtures[0]!;
    const base = `/v1/public/learning/${f.orgSlug}/courses/${f.manifest.course.slug}`;
    const course = await app.inject({ method: "GET", url: base });
    expect(course.statusCode, course.body).toBe(200);
    expect(course.headers["cache-control"]).toBe("no-store");
    const parsed = publicLearningCourseSchema.parse(course.json());
    expect(parsed.course.slug).toBe(f.manifest.course.slug);
    expect(parsed.offering.slug).toBe(offeringSlug);
    const lesson = await app.inject({ method: "GET", url: `${base}/lessons/${lessonSlug}` });
    expect(lesson.statusCode, lesson.body).toBe(200);
    expect(publicLearningLessonSchema.parse(lesson.json()).lesson.slug).toBe(lessonSlug);
    for (const url of [
      `/v1/public/learning/${f.orgSlug}/courses/missing-course`,
      `${base}/lessons/missing-lesson`
    ])
      expect((await app.inject({ method: "GET", url })).statusCode).toBe(404);
    const privileges = await runtime.query(
      "SELECT has_function_privilege(current_user,'learning_content.find_public_course_version_ids(uuid,text)','EXECUTE') AS content,has_function_privilege(current_user,'learning_delivery.resolve_public_course_offering(text,text)','EXECUTE') AS delivery"
    );
    expect(privileges.rows[0]).toEqual({ content: false, delivery: true });
  });
  it("a newer draft cannot replace the release pinned by the public Offering", async () => {
    const f = fixtures[0]!;
    const draft = structuredClone(f.manifest);
    draft.course.title = "PRIVATE_DRAFT_TITLE";
    draft.lessons[0]!.blocks[1] = {
      type: "markdown",
      markdown: "PRIVATE_DRAFT_NOTES"
    };
    const plan = await post(
      `organizations/${f.org}/courses/manifest/validate`,
      draft
    );
    const imported = await post(
      `organizations/${f.org}/courses/manifest/apply`,
      {
        manifest: draft,
        expectedDraftVersionId: plan.expectedDraftVersionId,
        expectedRevision: plan.expectedRevision
      }
    );
    expect(imported.draftVersionId).not.toBe(f.version);
    const publicLesson = await get(f, `/lessons/${lessonSlug}`);
    expect(publicLesson.body).not.toContain("PRIVATE_DRAFT");
    expect(publicLesson.json().course.title).toBe("Public course 0");
    const stable = await app.inject({
      method: "GET",
      url: `/v1/public/learning/${f.orgSlug}/courses/${f.manifest.course.slug}`
    });
    expect(stable.json().course.title).toBe("Public course 0");
  });
  it("ordinary RLS remains closed and private resolver functions are not API capabilities", async () => {
    expect(
      (
        await runtime.query(
          "SELECT * FROM learning_content.course_version_lessons"
        )
      ).rows
    ).toEqual([]);
    await withTenantTransaction(
      runtime,
      { organizationId: fixtures[1]!.org, userId: owner },
      async (tx) => {
        expect(
          (
            await tx.client.query(
              "SELECT * FROM learning_content.course_version_lessons WHERE organization_id=$1",
              [fixtures[0]!.org]
            )
          ).rows
        ).toEqual([]);
      }
    );
    const privileges = await runtime.query(
      "SELECT has_function_privilege(current_user,'learning_delivery.resolve_public_learning_version(text,text)','EXECUTE') AS delivery,has_function_privilege(current_user,'organizations.find_active_public_organization_slug(uuid)','EXECUTE') AS org"
    );
    expect(privileges.rows[0]).toEqual({ delivery: false, org: false });
    const updates = await runtime.query(
      "SELECT has_table_privilege(current_user,'learning_delivery.learning_offerings','UPDATE') AS broad,has_column_privilege(current_user,'learning_delivery.learning_offerings','visibility','UPDATE') AS visibility,has_column_privilege(current_user,'learning_delivery.learning_offerings','delivery_mode','UPDATE') AS identity"
    );
    expect(updates.rows[0]).toEqual({
      broad: false,
      visibility: true,
      identity: false
    });
    const readonly = await app.inject({
      method: "GET",
      url: `/v1/public/learning/${fixtures[0]!.orgSlug}/${offeringSlug}?courseVersionId=${randomUUID()}`
    });
    expect(readonly.statusCode).toBe(200);
    expect(readonly.json().course.title).toBe("Public course 0");
  });
  it("rolls visibility back when the canonical outbox write fails", async () => {
    const before = await events();
    const spy = vi
      .spyOn(app.get(OutboxRepository), "append")
      .mockRejectedValueOnce(new Error("Controlled visibility outbox failure"));
    try {
      await visibility(fixtures[0], "private", owner, origin, 500);
    } finally {
      spy.mockRestore();
    }
    expect(await events()).toBe(before);
    expect((await get()).statusCode).toBe(200);
  });
  it("explicit withdrawal removes both course and lesson on the next uncached read", async () => {
    await visibility(fixtures[0], "private");
    await get(fixtures[0], "", 404);
    await get(fixtures[0], `/lessons/${lessonSlug}`, 404);
    const stable = await app.inject({
      method: "GET",
      url: `/v1/public/learning/${fixtures[0]!.orgSlug}/courses/${fixtures[0]!.manifest.course.slug}`
    });
    expect(stable.statusCode).toBe(404);
  });
});
