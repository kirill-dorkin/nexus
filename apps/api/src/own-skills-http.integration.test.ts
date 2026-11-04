import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { courseManifestV1Schema, ownSkillsSchema } from "@platform/contracts";
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

describe("own organization skills HTTP + PostgreSQL boundary (ADR-0074)", () => {
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
    request("GET", `me/skills/${org.slug}`, undefined, actor, expected);
  const ownSkills = async (actor: string) => {
    const response = await skills(actor);
    expect(response.headers["cache-control"]).toBe("no-store");
    const body = response.json();
    expect(Object.keys(body)).toEqual(["skills"]);
    return ownSkillsSchema.parse(body).skills;
  };
  const answer = (user: string, optionId: string) =>
    request(
      "POST",
      `${route()}/quiz/components-check/check`,
      {
        attemptKey: randomUUID(),
        answer: { type: "quiz.single_choice", optionId }
      },
      user
    );
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
      slug: `own-skills-${randomUUID()}`,
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

  it("rejects anonymous callers and unknown organizations", async () => {
    await skills(null, 401);
    const missing = await request(
      "GET",
      `me/skills/missing-${randomUUID()}`,
      undefined,
      learner,
      404
    );
    expect(missing.headers["cache-control"]).toBe("no-store");
    await request("GET", "me/skills/Bad%20Slug", undefined, learner, 400);
  });

  it("gives a non-member and a member without Evidence no skills", async () => {
    expect(await ownSkills(learner)).toEqual([]);
    await enter(learner);
    expect(await ownSkills(learner)).toEqual([]);
  });

  it("counts only passing Evidence as confirmations, keyed by skillKey", async () => {
    await answer(learner, "ram");
    const failed = await ownSkills(learner);
    expect(failed).toEqual([
      {
        skillKey: "computer-components",
        masteryScore: 0,
        evidenceCount: 1,
        scoredEvidenceCount: 1,
        lastEvidenceAt: expect.any(String),
        confirmations: 0,
        firstConfirmedAt: null,
        lastConfirmedAt: null,
        confirmedDays: []
      }
    ]);

    await answer(learner, "cpu");
    const [passed] = await ownSkills(learner);
    expect(passed).toMatchObject({
      skillKey: "computer-components",
      evidenceCount: 2,
      scoredEvidenceCount: 2,
      confirmations: 1
    });
    expect(passed!.masteryScore).toBeGreaterThan(0);
    expect(passed!.firstConfirmedAt).toBe(passed!.lastConfirmedAt);
    expect(passed!.lastConfirmedAt).toBe(passed!.lastEvidenceAt);
    expect(passed!.confirmedDays).toEqual([
      passed!.lastConfirmedAt!.slice(0, 10)
    ]);
    expect(Date.parse(passed!.lastEvidenceAt)).toBeGreaterThanOrEqual(
      Date.parse(failed[0]!.lastEvidenceAt)
    );

    await answer(learner, "cpu");
    const [twice] = await ownSkills(learner);
    expect(twice).toMatchObject({ evidenceCount: 3, confirmations: 2 });
    expect(twice!.firstConfirmedAt).toBe(passed!.firstConfirmedAt);
    // Two confirmations within one UTC day count as one confirmed day.
    expect(twice!.confirmedDays).toEqual(
      [
        ...new Set([
          twice!.firstConfirmedAt!.slice(0, 10),
          twice!.lastConfirmedAt!.slice(0, 10)
        ])
      ].sort()
    );
    expect(Date.parse(twice!.lastConfirmedAt!)).toBeGreaterThanOrEqual(
      Date.parse(passed!.lastConfirmedAt!)
    );
  });

  it("never shows another user's Evidence", async () => {
    expect(await ownSkills(other)).toEqual([]);
    await enter(other);
    expect(await ownSkills(other)).toEqual([]);
    await answer(other, "ram");
    expect(await ownSkills(other)).toEqual([
      expect.objectContaining({
        skillKey: "computer-components",
        evidenceCount: 1,
        confirmations: 0
      })
    ]);
    expect((await ownSkills(learner))[0]).toMatchObject({
      evidenceCount: 3,
      confirmations: 2
    });
  });
});
