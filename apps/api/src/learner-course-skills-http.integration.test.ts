import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  courseManifestV1Schema,
  learnerCourseSkillsSchema
} from "@platform/contracts";
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

describe("own course skills HTTP + PostgreSQL boundary", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL"));
  const origin = "https://learning.example.test",
    oldOrigin = process.env.WEB_APP_ORIGIN;
  const users: string[] = [];
  let app: NestFastifyApplication,
    owner: string,
    learner: string,
    other: string,
    org: { id: string; slug: string };
  const slug = "skills-course";

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
  const route = () => `me/learning/${org.slug}/${slug}`;
  const skills = (actor: string | null, expected = 200) =>
    request("GET", `${route()}/skills`, undefined, actor, expected);
  async function enter(user: string) {
    await request(
      "POST",
      `public/organizations/${org.slug}/memberships/me`,
      {},
      user
    );
    await request("POST", `${route()}/enrollment`, {}, user);
  }

  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = origin;
    for (const name of ["Skills owner", "Skills learner", "Other learner"])
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
      slug: `skills-${randomUUID()}`,
      name: "Skills academy"
    });
    const manifest = courseManifestV1Schema.parse(
      JSON.parse(
        readFileSync("docs/examples/computer-basics.manifest.json", "utf8")
      )
    );
    manifest.course.slug = `skills-course-${randomUUID()}`;
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

  it("rejects anonymous callers and callers without their own enrollment", async () => {
    await skills(null, 401);
    await skills(learner, 404);
    await request(
      "POST",
      `public/organizations/${org.slug}/memberships/me`,
      {},
      learner
    );
    // A member without an enrollment still has no skills to read.
    await skills(learner, 404);
    const missing = await request(
      "GET",
      `me/learning/${org.slug}/missing-course/skills`,
      undefined,
      learner,
      404
    );
    expect(missing.headers["cache-control"]).toBe("no-store");
  });

  it("returns only the caller's own skill state, without tenant ids", async () => {
    await request("POST", `${route()}/enrollment`, {}, learner);
    const before = await skills(learner);
    expect(before.headers["cache-control"]).toBe("no-store");
    const body = before.json();
    expect(Object.keys(body)).toEqual(["skills"]);
    expect(learnerCourseSkillsSchema.parse(body).skills).toEqual([
      expect.objectContaining({
        title: expect.any(String),
        state: "unobserved",
        masteryScore: null,
        evidenceCount: 0
      })
    ]);

    await request(
      "POST",
      `${route()}/quiz/components-check/check`,
      {
        attemptKey: randomUUID(),
        answer: { type: "quiz.single_choice", optionId: "cpu" }
      },
      learner
    );
    const after = learnerCourseSkillsSchema.parse(
      (await skills(learner)).json()
    );
    expect(after.skills).toEqual([
      expect.objectContaining({
        state: "assessed",
        masteryScore: 1,
        evidenceCount: 1,
        scoredEvidenceCount: 1
      })
    ]);

    // Another learner reads their own enrollment, never the first learner's mastery.
    await skills(other, 404);
    await enter(other);
    const foreign = learnerCourseSkillsSchema.parse(
      (await skills(other)).json()
    );
    expect(foreign.skills).toEqual([
      expect.objectContaining({ state: "unobserved", masteryScore: null })
    ]);
  });
});
