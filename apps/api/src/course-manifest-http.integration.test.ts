import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  courseManifestV1Schema,
  type CourseManifestV1,
  type CourseManifestPlan
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
import type { ManifestQuizActivity } from "@platform/contracts";

function env(name: string) {
  const value = process.env[name];
  if (!value)
    throw new Error(`${name} is required for manifest integration tests.`);
  return value;
}

describe("course manifest HTTP + PostgreSQL authoring", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL"));
  const runtime = createDatabasePool(env("DATABASE_URL"));
  const originalOrigin = process.env.WEB_APP_ORIGIN;
  const origin = "https://authoring.example.test";
  let app: NestFastifyApplication;
  const users: string[] = [];
  const organizations: string[] = [];
  let owner = "";
  let learner = "";
  let org = "";
  let foreignOrg = "";
  let course = "";
  let version = "";
  let manifest: CourseManifestV1;
  let publishedManifest: CourseManifestV1;

  async function post(
    path: string,
    payload: unknown,
    user = owner,
    expected = 200
  ) {
    const result = await app.inject({
      method: "POST",
      url: `/v1/${path}`,
      headers: { "x-test-user-id": user, origin },
      payload: payload as object
    });
    expect(result.statusCode, result.body).toBe(expected);
    return result.body.length ? result.json() : null;
  }
  async function plan(m = manifest): Promise<CourseManifestPlan> {
    return post(`organizations/${org}/courses/manifest/validate`, m);
  }
  async function apply(m = manifest) {
    const preview = await plan(m);
    return post(`organizations/${org}/courses/manifest/apply`, {
      manifest: m,
      expectedDraftVersionId: preview.expectedDraftVersionId,
      expectedRevision: preview.expectedRevision
    });
  }
  async function exportDraft(id = version): Promise<CourseManifestV1> {
    const r = await app.inject({
      method: "GET",
      url: `/v1/organizations/${org}/courses/${course}/versions/${id}/manifest`,
      headers: { "x-test-user-id": owner }
    });
    expect(r.statusCode, r.body).toBe(200);
    return r.json();
  }
  async function counts() {
    return (
      await migration.query(
        "SELECT (SELECT count(*) FROM learning_content.courses WHERE organization_id=$1)::int AS courses,(SELECT count(*) FROM events.outbox WHERE organization_id=$1)::int AS events,(SELECT count(*) FROM learning_content.skills WHERE organization_id=$1)::int AS skills",
        [org]
      )
    ).rows[0];
  }
  async function identities(id = version) {
    return (
      await migration.query(
        "SELECT (SELECT array_agg(lesson_id::text ORDER BY position) FROM learning_content.course_version_lessons WHERE organization_id=$1 AND course_version_id=$2) AS lessons,(SELECT array_agg(activity_id::text ORDER BY position) FROM learning_content.course_version_activities WHERE organization_id=$1 AND course_version_id=$2) AS activities",
        [org, id]
      )
    ).rows[0];
  }

  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = origin;
    for (const label of ["manifest-owner", "manifest-learner"]) {
      const id = (
        await migration.query<{ id: string }>(
          "INSERT INTO identity.users (email,display_name) VALUES ($1,$2) RETURNING id::text",
          [`${randomUUID()}@example.test`, label]
        )
      ).rows[0]!.id;
      users.push(id);
    }
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
      const created = await createTestOrganization(migration, owner, {
        slug: `manifest-${randomUUID()}`,
        name: "Manifest integration"
      });
      organizations.push(created.id);
    }
    [org, foreignOrg] = [organizations[0]!, organizations[1]!];
    await post(
      `organizations/${org}/memberships`,
      { userId: learner },
      owner,
      201
    );
    await post(`organizations/${org}/memberships/me/accept`, {}, learner);
    await post(
      `organizations/${org}/role-assignments`,
      {
        userId: learner,
        roleKey: "learner",
        scope: { type: "organization", id: org }
      },
      owner,
      204
    );
    manifest = courseManifestV1Schema.parse(
      JSON.parse(
        readFileSync(
          path.resolve("docs/examples/computer-basics.manifest.json"),
          "utf8"
        )
      )
    );
    // Chapters round-trip through import, export and cloning (ADR-0063).
    manifest.lessons[0]!.chapter = "Введение";
    manifest.course.slug = `example-${randomUUID()}`;
    (manifest.activities[0] as ManifestQuizActivity).validation.explanation =
      "PRIVATE_EXPLANATION_SENTINEL";
  });

  afterAll(async () => {
    if (app) await app.close();
    for (const id of organizations) {
      await migration.query(
        "DELETE FROM events.outbox WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM learning_delivery.assignments WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM learning_delivery.enrollments WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM learning_delivery.learning_offerings WHERE organization_id=$1",
        [id]
      );
      // Delete dependents first; the migration role retains operational purge authority.
      await migration.query(
        "DELETE FROM learning_content.course_version_lesson_blocks WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM learning_content.course_version_lessons WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM learning_content.quiz_validation_configs WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM learning_content.activity_skill_mappings WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM learning_content.course_version_activities WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM learning_content.course_version_skills WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM learning_content.activities WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM learning_content.skills WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM learning_content.courses WHERE organization_id=$1",
        [id]
      );
      await migration.query(
        "DELETE FROM organizations.organizations WHERE id=$1",
        [id]
      );
    }
    await migration.query(
      "DELETE FROM identity.users WHERE id=ANY($1::uuid[])",
      [users]
    );
    await Promise.all([migration.end(), runtime.end()]);
    if (originalOrigin === undefined) delete process.env.WEB_APP_ORIGIN;
    else process.env.WEB_APP_ORIGIN = originalOrigin;
  });

  it("dry-run validates before mutation and returns no answer material", async () => {
    const before = await counts();
    const preview = await plan();
    expect(preview.mode).toBe("create_course");
    expect(preview.expectedRevision).toBe(0);
    expect(JSON.stringify(preview)).not.toContain(
      "PRIVATE_EXPLANATION_SENTINEL"
    );
    expect(await counts()).toEqual(before);
    await post(
      `organizations/${org}/courses/manifest/validate`,
      { ...manifest, schemaVersion: 999 },
      owner,
      400
    );
    expect(await counts()).toEqual(before);
  });

  it("denies anonymous, learner authoring, and mismatched browser origin", async () => {
    await post(
      `organizations/${org}/courses/manifest/validate`,
      manifest,
      "",
      401
    );
    await post(
      `organizations/${org}/courses/manifest/validate`,
      manifest,
      learner,
      403
    );
    const r = await app.inject({
      method: "POST",
      url: `/v1/organizations/${org}/courses/manifest/apply`,
      headers: {
        "x-test-user-id": owner,
        origin: "https://foreign.example.test"
      },
      payload: { manifest, expectedDraftVersionId: null, expectedRevision: 0 }
    });
    expect(r.statusCode).toBe(403);
  });

  it("imports a new course atomically and exports an equivalent canonical graph", async () => {
    const result = await apply();
    course = result.courseId;
    version = result.draftVersionId;
    expect(await exportDraft()).toEqual(manifest);
    const state = await counts();
    expect(state.courses).toBe(1);
    expect(state.skills).toBe(1);
    expect((await plan()).mode).toBe("replace_draft");
    const events = await migration.query(
      "SELECT event_name,payload FROM events.outbox WHERE organization_id=$1",
      [org]
    );
    expect(events.rows.map((r) => r.event_name)).toContain(
      "course_version.manifest_imported"
    );
    expect(JSON.stringify(events.rows)).not.toContain(
      "PRIVATE_EXPLANATION_SENTINEL"
    );
    expect(JSON.stringify(events.rows)).not.toContain("correctOptionId");
  });

  it("denies learner and foreign-draft export, with effective RLS on new tables", async () => {
    const path = `/v1/organizations/${org}/courses/${course}/versions/${version}/manifest`;
    expect(
      (
        await app.inject({
          method: "GET",
          url: path,
          headers: { "x-test-user-id": learner }
        })
      ).statusCode
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/v1/organizations/${foreignOrg}/courses/${course}/versions/${version}/manifest`,
          headers: { "x-test-user-id": owner }
        })
      ).statusCode
    ).toBe(404);
    await withTenantTransaction(
      runtime,
      { organizationId: foreignOrg, userId: owner },
      async (tx) => {
        for (const table of [
          "lessons",
          "manifest_activity_identities",
          "course_version_lessons",
          "course_version_lesson_blocks",
          "quiz_validation_configs"
        ]) {
          expect(
            (
              await tx.client.query(
                `SELECT count(*)::int AS n FROM learning_content.${table} WHERE organization_id=$1`,
                [org]
              )
            ).rows[0].n
          ).toBe(0);
        }
      }
    );
    await expect(
      withTenantTransaction(
        runtime,
        { organizationId: foreignOrg, userId: owner },
        (tx) =>
          tx.client.query(
            "INSERT INTO learning_content.lessons (organization_id,course_id,slug,created_by_user_id) VALUES ($1,$2,$3,$4)",
            [org, course, "foreign-write", owner]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("replaces the draft, preserves stable identities, and rejects stale previews", async () => {
    const before = await identities();
    const stale = await plan();
    manifest.lessons[0]!.title = "Updated example";
    await apply();
    expect(await identities()).toEqual(before);
    expect(await exportDraft()).toEqual(manifest);
    await post(
      `organizations/${org}/courses/manifest/apply`,
      {
        manifest,
        expectedDraftVersionId: stale.expectedDraftVersionId,
        expectedRevision: stale.expectedRevision
      },
      owner,
      409
    );
    expect(await exportDraft()).toEqual(manifest);
  });

  it("prevents generic Activity authoring from leaking quiz answers", async () => {
    const skill = (
      await migration.query(
        "SELECT id::text FROM learning_content.skills WHERE organization_id=$1",
        [org]
      )
    ).rows[0];
    await post(
      `organizations/${org}/courses/${course}/versions/${version}/activities`,
      {
        slug: "unsafe-quiz",
        activityType: "quiz.single_choice",
        title: "Unsafe",
        skillIds: [skill.id],
        config: { correctOptionId: "PRIVATE_ANSWER_SENTINEL" }
      },
      owner,
      400
    );
    expect(await exportDraft()).toEqual(manifest);
  });

  it("rolls back the full graph, new Skills and revision if the canonical outbox write fails", async () => {
    const before = {
      counts: await counts(),
      ids: await identities(),
      plan: await plan(),
      manifest: await exportDraft()
    };
    const changed = structuredClone(manifest);
    changed.skills.push({
      key: `rollback-${randomUUID()}`,
      title: "Rollback fixture",
      description: ""
    });
    changed.lessons[0]!.title = "Must roll back";
    const preview = await plan(changed);
    const outbox = app.get(OutboxRepository);
    const originalAppend = outbox.append.bind(outbox);
    const failure = vi
      .spyOn(outbox, "append")
      .mockImplementation((tx, event) =>
        event.eventName === "course_version.manifest_imported"
          ? Promise.reject(new Error("Controlled final outbox failure"))
          : originalAppend(tx, event)
      );
    try {
      await post(
        `organizations/${org}/courses/manifest/apply`,
        {
          manifest: changed,
          expectedDraftVersionId: preview.expectedDraftVersionId,
          expectedRevision: preview.expectedRevision
        },
        owner,
        500
      );
    } finally {
      failure.mockRestore();
    }
    expect({
      counts: await counts(),
      ids: await identities(),
      plan: await plan(),
      manifest: await exportDraft()
    }).toEqual(before);
  });

  it("rejects invalid protected configuration before publication", async () => {
    const config = (
      await migration.query(
        "SELECT activity_version_id::text,config FROM learning_content.quiz_validation_configs WHERE organization_id=$1 AND course_version_id=$2",
        [org, version]
      )
    ).rows[0];
    await migration.query(
      "UPDATE learning_content.quiz_validation_configs SET config='{}'::jsonb WHERE activity_version_id=$1",
      [config.activity_version_id]
    );
    await post(
      `organizations/${org}/courses/${course}/versions/${version}/publish`,
      {},
      owner,
      409
    );
    await migration.query(
      "UPDATE learning_content.quiz_validation_configs SET config=$2::jsonb WHERE activity_version_id=$1",
      [config.activity_version_id, JSON.stringify(config.config)]
    );
    publishedManifest = await exportDraft();
    await post(
      `organizations/${org}/courses/${course}/versions/${version}/publish`,
      {}
    );
  });

  it("published lessons, blocks, graph and protected answers are immutable to runtime", async () => {
    for (const table of [
      "course_version_lessons",
      "course_version_lesson_blocks",
      "quiz_validation_configs",
      "course_version_activities",
      "course_version_skills",
      "activity_skill_mappings"
    ]) {
      await expect(
        withTenantTransaction(
          runtime,
          { organizationId: org, userId: owner },
          (tx) =>
            tx.client.query(
              `DELETE FROM learning_content.${table} WHERE organization_id=$1 AND course_version_id=$2`,
              [org, version]
            )
        )
      ).rejects.toMatchObject({ code: "55000" });
    }
    const r = await app.inject({
      method: "GET",
      url: `/v1/organizations/${org}/courses/${course}/versions/${version}/manifest`,
      headers: { "x-test-user-id": owner }
    });
    expect(r.statusCode).toBe(409);
  });

  it("proves the actual learner runner response excludes answer keys and explanation", async () => {
    const offering = await post(
      `organizations/${org}/offerings`,
      {
        slug: `offering-${randomUUID()}`,
        name: "Example",
        courseVersionId: version,
        deliveryMode: "self_paced",
        accessMode: "membership"
      },
      owner,
      201
    );
    const enrollment = await post(
      `organizations/${org}/offerings/${offering.id}/enrollments`,
      { userId: learner },
      owner,
      201
    );
    const activity = (
      await migration.query(
        "SELECT activity_id::text FROM learning_content.course_version_activities WHERE organization_id=$1 AND course_version_id=$2",
        [org, version]
      )
    ).rows[0];
    await post(
      `organizations/${org}/offerings/${offering.id}/assignments`,
      {
        slug: `assignment-${randomUUID()}`,
        name: "Example",
        activityId: activity.activity_id,
        audience: { type: "offering" }
      },
      owner,
      201
    );
    const r = await app.inject({
      method: "GET",
      url: `/v1/organizations/${org}/enrollments/${enrollment.id}/runner`,
      headers: { "x-test-user-id": learner }
    });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().assignments).toHaveLength(1);
    for (const secret of [
      "correctOptionId",
      "correctOptionIds",
      "acceptedAnswers",
      "PRIVATE_EXPLANATION_SENTINEL",
      "explanation"
    ])
      expect(r.body).not.toContain(secret);
    expect(r.json().assignments[0].activity.config.presentation.question).toBe(
      (manifest.activities[0] as ManifestQuizActivity).presentation.question
    );
  });

  it("clones published lessons and protected definitions into the ordinary new draft", async () => {
    const next = await post(
      `organizations/${org}/courses/${course}/versions`,
      {
        title: manifest.course.title,
        description: manifest.course.description
      },
      owner,
      201
    );
    expect(await exportDraft(next.id)).toEqual(publishedManifest);
    expect(await identities(next.id)).toEqual(await identities());
    manifest.course.title = "Next edition";
    const nextResult = await apply();
    expect(nextResult.draftVersionId).toBe(next.id);
    expect(await exportDraft(next.id)).toEqual(manifest);
    const oldTitle = (
      await migration.query(
        "SELECT title FROM learning_content.course_versions WHERE id=$1",
        [version]
      )
    ).rows[0].title;
    expect(oldTitle).toBe(publishedManifest.course.title);
    await post(
      `organizations/${org}/courses/${course}/versions/${next.id}/publish`,
      {}
    );
    const preview = await plan();
    expect(preview.mode).toBe("create_draft");
    const imported = await apply();
    expect(imported.draftVersionId).not.toBe(next.id);
    expect(await exportDraft(imported.draftVersionId)).toEqual(manifest);
  });

  it("does not silently erase legacy draft features", async () => {
    const legacy = await post(
      `organizations/${org}/courses`,
      { slug: `legacy-${randomUUID()}`, title: "Legacy" },
      owner,
      201
    );
    const skill = (
      await migration.query(
        "SELECT id::text FROM learning_content.skills WHERE organization_id=$1",
        [org]
      )
    ).rows[0];
    await post(
      `organizations/${org}/courses/${legacy.course.id}/versions/${legacy.draftVersion.id}/skills`,
      { skillId: skill.id },
      owner,
      201
    );
    await post(
      `organizations/${org}/courses/${legacy.course.id}/versions/${legacy.draftVersion.id}/activities`,
      {
        slug: "legacy-activity",
        activityType: "code-grader",
        title: "Legacy code",
        skillIds: [skill.id]
      },
      owner,
      201
    );
    const before = await counts();
    await post(
      `organizations/${org}/courses/manifest/validate`,
      { ...manifest, course: { ...manifest.course, slug: legacy.course.slug } },
      owner,
      409
    );
    expect(await counts()).toEqual(before);
  });

  it("serializes concurrent import and publication without altering a published Lesson", async () => {
    const candidate = structuredClone(manifest);
    candidate.course.slug = `race-${randomUUID()}`;
    candidate.lessons[0]!.title = "Before race";
    const created = await apply(candidate);
    const preview = await plan(candidate);
    candidate.lessons[0]!.title = "After race";
    const [imported, published] = await Promise.all([
      app.inject({
        method: "POST",
        url: `/v1/organizations/${org}/courses/manifest/apply`,
        headers: { "x-test-user-id": owner, origin },
        payload: {
          manifest: candidate,
          expectedDraftVersionId: preview.expectedDraftVersionId,
          expectedRevision: preview.expectedRevision
        }
      }),
      app.inject({
        method: "POST",
        url: `/v1/organizations/${org}/courses/${created.courseId}/versions/${created.draftVersionId}/publish`,
        headers: { "x-test-user-id": owner },
        payload: {}
      })
    ]);
    expect(published.statusCode, published.body).toBe(200);
    expect([200, 409]).toContain(imported.statusCode);
    const snapshot = (
      await migration.query(
        "SELECT v.status,l.title FROM learning_content.course_versions v JOIN learning_content.course_version_lessons l ON l.organization_id=v.organization_id AND l.course_version_id=v.id WHERE v.id=$1",
        [created.draftVersionId]
      )
    ).rows[0];
    expect(snapshot.status).toBe("published");
    expect(snapshot.title).toBe(
      imported.statusCode === 200 ? "After race" : "Before race"
    );
    await expect(
      withTenantTransaction(
        runtime,
        { organizationId: org, userId: owner },
        (tx) =>
          tx.client.query(
            "DELETE FROM learning_content.course_version_lessons WHERE course_version_id=$1",
            [created.draftVersionId]
          )
      )
    ).rejects.toMatchObject({ code: "55000" });
  });
});
