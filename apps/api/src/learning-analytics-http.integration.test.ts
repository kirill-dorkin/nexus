import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { courseManifestV1Schema } from "@platform/contracts";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestOrganization } from "./test-support/create-test-organization";
import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw Error(`${name} required`);
  return v;
}

describe("learning analytics HTTP + PostgreSQL boundary (ADR-0084)", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL"));
  const origin = "https://learning.example.test",
    oldOrigin = process.env.WEB_APP_ORIGIN;
  const users: string[] = [];
  let app: NestFastifyApplication,
    owner: string,
    learner: string,
    other: string,
    org: { id: string; slug: string };
  const slug = "analytics-course";
  const lesson = "computer-introduction";

  async function request(
    method: "POST" | "GET" | "PATCH" | "PUT",
    path: string,
    payload: object | undefined,
    actor: string | null,
    expected = 200,
    from = origin
  ) {
    const r = await app.inject({
      method,
      url: `/v1/${path}`,
      headers: { origin: from, ...(actor ? { "x-test-user-id": actor } : {}) },
      ...(payload !== undefined ? { payload } : {})
    });
    expect(r.statusCode, r.body).toBe(expected);
    return r;
  }
  const address = (lessonSlug = lesson) => ({
    organizationSlug: org.slug,
    offeringSlug: slug,
    lessonSlug
  });
  const report = (
    events: object[],
    actor: string | null = null,
    expected = 204,
    from = origin
  ) => request("POST", "analytics/learning", { events }, actor, expected, from);
  const daily = async () =>
    Object.fromEntries(
      (
        await migration.query<{ metric: string; value: string }>(
          "SELECT metric, value::text FROM analytics.lesson_daily WHERE organization_id=$1 AND lesson_slug=$2",
          [org.id, lesson]
        )
      ).rows.map((row) => [row.metric, Number(row.value)])
    );
  const learnerTime = async (user: string) =>
    (
      await migration.query<{ active_seconds: number }>(
        "SELECT active_seconds FROM analytics.learner_lesson_time WHERE organization_id=$1 AND user_id=$2",
        [org.id, user]
      )
    ).rows.map((row) => row.active_seconds);

  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = origin;
    for (const name of [
      "Analytics owner",
      "Analytics learner",
      "Other learner"
    ])
      users.push(
        (
          await migration.query<{ id: string }>(
            "INSERT INTO identity.users(email,display_name) VALUES($1,$2) RETURNING id",
            [`${randomUUID()}@example.test`, name]
          )
        ).rows[0]!.id
      );
    [owner, learner, other] = [users[0]!, users[1]!, users[2]!];
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
      slug: `analytics-${randomUUID()}`,
      name: "Analytics academy"
    });
    const manifest = courseManifestV1Schema.parse(
      JSON.parse(
        readFileSync("docs/examples/computer-basics.manifest.json", "utf8")
      )
    );
    manifest.course.slug = `analytics-course-${randomUUID()}`;
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
    const offering = (
      await request(
        "POST",
        `organizations/${org.id}/offerings`,
        {
          slug,
          name: "Skills offering",
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
  });

  afterAll(async () => {
    if (app) await app.close();
    if (org) {
      for (const table of [
        "events.outbox",
        "learning_history.learning_events",
        "learning_progress.evidence",
        "learning_validation.validation_results",
        "learning_progress.submissions",
        "learning_progress.attempts",
        "learning_progress.mastery_projections",
        "learning_delivery.enrollments",
        "analytics.learner_lesson_time",
        "analytics.lesson_daily",
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

  it("counts anonymous views and active time without a learner row", async () => {
    await report([
      { type: "lesson_step", step: "lesson_viewed", ...address() },
      { type: "lesson_active", seconds: 30, ...address() }
    ]);
    expect(await daily()).toMatchObject({
      lesson_viewed: 1,
      active_seconds_anonymous: 30
    });
    expect(await learnerTime(learner)).toEqual([]);
  });

  it("attributes active time to the signed-in learner", async () => {
    await report(
      [{ type: "lesson_active", seconds: 20, ...address() }],
      learner
    );
    await report(
      [
        { type: "lesson_active", seconds: 25, ...address() },
        { type: "lesson_step", step: "video_started", ...address() }
      ],
      learner
    );
    expect(await learnerTime(learner)).toEqual([45]);
    expect(await learnerTime(other)).toEqual([]);
    expect(await daily()).toMatchObject({
      active_seconds_signed_in: 45,
      video_started: 1
    });
  });

  it("drops addresses that are not public lessons", async () => {
    const before = await daily();
    await report([
      {
        type: "lesson_step",
        step: "lesson_viewed",
        ...address("no-such-lesson")
      },
      {
        type: "lesson_step",
        step: "lesson_viewed",
        ...address(),
        offeringSlug: "not-an-offering"
      }
    ]);
    expect(await daily()).toEqual(before);
    const stray = await migration.query(
      "SELECT 1 FROM analytics.lesson_daily WHERE organization_id=$1 AND lesson_slug='no-such-lesson'",
      [org.id]
    );
    expect(stray.rowCount).toBe(0);
  });

  it("refuses other origins, oversized time and unknown fields", async () => {
    const event = { type: "lesson_active", seconds: 10, ...address() };
    await report([event], null, 403, "https://evil.example.test");
    await report([{ ...event, seconds: 61 }], null, 400);
    await report([{ ...event, url: "https://x.test/?q=1" }], null, 400);
    await report([], null, 400);
  });
});
