import { randomUUID } from "node:crypto";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { publicSkillMapSchema } from "@platform/contracts";
import { createDatabasePool, withTenantTransaction } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestOrganization } from "./test-support/create-test-organization";
import {
  deleteSkillMapOrganization,
  skillMapCourse,
  skillMapManifest
} from "./test-support/skill-map-fixture";
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

describe("skill map HTTP + PostgreSQL boundary (ADR-0078)", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL"));
  const runtime = createDatabasePool(env("DATABASE_URL"));
  const origin = "https://learning.example.test",
    oldOrigin = process.env.WEB_APP_ORIGIN;
  const users: string[] = [];
  const orgs: { id: string; slug: string }[] = [];
  let app: NestFastifyApplication, owner: string, stranger: string;
  let org: { id: string; slug: string }, other: { id: string; slug: string };
  const courseSlug = `map-course-${randomUUID()}`;
  const keys = ["map-a", "map-b", "map-c"];
  const manifest = () =>
    skillMapManifest(courseSlug, [
      { slug: "base", skills: ["map-a", "map-b"] },
      { slug: "next", skills: ["map-c"], requires: ["base"] }
    ]);

  async function request(
    method: "POST" | "GET",
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
  const validate = (body: object, actor = owner, expected = 200) =>
    request(
      "POST",
      `organizations/${org.id}/skill-maps/manifest/validate`,
      body,
      actor,
      expected
    );
  const apply = (body: object, actor = owner, expected = 200) =>
    request(
      "POST",
      `organizations/${org.id}/skill-maps/manifest/apply`,
      body,
      actor,
      expected
    );
  const publicMap = async (slug: string) => {
    const r = await request("GET", `public/skill-map/${slug}`, undefined, null);
    expect(r.headers["cache-control"]).toBe("no-store");
    return publicSkillMapSchema.parse(r.json());
  };

  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = origin;
    for (const name of ["Map owner", "Map stranger"])
      users.push(
        (
          await migration.query<{ id: string }>(
            "INSERT INTO identity.users(email,display_name) VALUES($1,$2) RETURNING id",
            [`${randomUUID()}@example.test`, name]
          )
        ).rows[0]!.id
      );
    [owner, stranger] = [users[0]!, users[1]!];
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
      slug: `skill-map-${randomUUID()}`,
      name: "Map academy"
    });
    other = await createTestOrganization(migration, stranger, {
      slug: `skill-map-other-${randomUUID()}`,
      name: "Other academy"
    });
    orgs.push(org, other);
    const course = skillMapCourse(courseSlug, keys);
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
    await request(
      "POST",
      `organizations/${org.id}/courses/${applied.courseId}/versions/${applied.draftVersionId}/publish`,
      {},
      owner
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    for (const o of orgs) await deleteSkillMapOrganization(migration, o.id);
    await migration.query(
      "DELETE FROM identity.users WHERE id=ANY($1::uuid[])",
      [users]
    );
    await runtime.end();
    await migration.end();
    if (oldOrigin === undefined) delete process.env.WEB_APP_ORIGIN;
    else process.env.WEB_APP_ORIGIN = oldOrigin;
  });

  it("serves no map before the first publication", async () => {
    expect(await publicMap(org.slug)).toEqual({
      organizationSlug: org.slug,
      map: null
    });
    expect((await publicMap(`missing-${randomUUID()}`)).map).toBeNull();
    await request("GET", "public/skill-map/Bad%20Slug", undefined, null, 400);
  });

  it("lets only course authors of the organization validate and apply", async () => {
    await validate(manifest(), null as unknown as string, 401);
    const denied = await validate(manifest(), stranger);
    expect([403, 404]).toContain(denied.statusCode);
  });

  it("refuses unknown skills, unpublished lessons, cycles and shared skills", async () => {
    const unknown = manifest();
    unknown.characters[1]!.branches[0]!.skills.push({
      key: "map-missing",
      title: "Нет",
      lesson: null,
      prerequisites: []
    });
    expect((await validate(unknown, owner, 400)).json()).toMatchObject({
      missingSkillKeys: ["map-missing"]
    });

    const draftLesson = manifest();
    draftLesson.characters[0]!.branches[0]!.skills[0]!.lesson = {
      course: "not-published",
      slug: "nowhere",
      title: "Нет"
    };
    expect((await validate(draftLesson, owner, 400)).json()).toMatchObject({
      unpublishedLessons: [{ course: "not-published", slug: "nowhere" }]
    });

    const cycle = manifest();
    cycle.characters[0]!.branches[0]!.skills[0]!.prerequisites = ["map-c"];
    expect((await validate(cycle, owner, 400)).body).toMatch(/skill cycle/);

    const shared = manifest();
    shared.characters[1]!.branches[0]!.skills.push({
      ...shared.characters[0]!.branches[0]!.skills[0]!,
      prerequisites: []
    });
    expect((await validate(shared, owner, 400)).body).toMatch(
      /belongs to base and next/
    );
  });

  it("publishes a version per apply, with prerequisites, and serves the latest", async () => {
    const plan = (await validate(manifest())).json();
    expect(plan).toEqual({
      mode: "create_map",
      skillMapId: null,
      expectedLatestVersionNumber: null,
      counts: { characters: 2, branches: 2, skills: 3, prerequisites: 2 }
    });
    await apply(
      { manifest: manifest(), expectedLatestVersionNumber: 1 },
      owner,
      409
    );
    const first = (
      await apply({ manifest: manifest(), expectedLatestVersionNumber: null })
    ).json();
    expect(first).toMatchObject({ versionNumber: 1, counts: plan.counts });
    expect((await publicMap(org.slug)).map).toEqual(manifest());

    const edges = await migration.query<{ skill: string; requires: string }>(
      `SELECT s.skill_key AS skill, r.skill_key AS requires
         FROM learning_content.skill_map_prerequisites p
         JOIN learning_content.skills s ON s.id = p.skill_id
         JOIN learning_content.skills r ON r.id = p.requires_skill_id
        WHERE p.skill_map_version_id = $1 ORDER BY 1`,
      [first.versionId]
    );
    expect(edges.rows).toEqual([
      { skill: "map-b", requires: "map-a" },
      { skill: "map-c", requires: "map-b" }
    ]);
    const event = await migration.query(
      "SELECT payload FROM events.outbox WHERE organization_id=$1 AND event_name='skill_map_version.published'",
      [org.id]
    );
    expect(event.rows[0]?.payload).toMatchObject({
      skillMapVersionId: first.versionId,
      versionNumber: 1
    });

    // A stale apply conflicts; a fresh validation gives the next version.
    await apply(
      { manifest: manifest(), expectedLatestVersionNumber: null },
      owner,
      409
    );
    const renamed = manifest();
    renamed.characters[0]!.name = "Основа";
    const second = (await validate(renamed)).json();
    expect(second).toMatchObject({
      mode: "create_version",
      skillMapId: first.skillMapId,
      expectedLatestVersionNumber: 1
    });
    expect(
      (
        await apply({ manifest: renamed, expectedLatestVersionNumber: 1 })
      ).json()
    ).toMatchObject({ skillMapId: first.skillMapId, versionNumber: 2 });
    expect((await publicMap(org.slug)).map?.characters[0]?.name).toBe(
      "Основа"
    );
  });

  it("keeps published versions and their prerequisites immutable", async () => {
    const version = (
      await migration.query<{ id: string }>(
        "SELECT id FROM learning_content.skill_map_versions WHERE organization_id=$1 AND version_number=1",
        [org.id]
      )
    ).rows[0]!.id;
    await expect(
      withTenantTransaction(
        runtime,
        { organizationId: org.id, userId: owner },
        (tx) =>
          tx.client.query(
            "UPDATE learning_content.skill_map_versions SET document = document || '{\"maxLevel\":1}' WHERE id=$1",
            [version]
          )
      )
    ).rejects.toMatchObject({ code: "55000" });
    await expect(
      withTenantTransaction(
        runtime,
        { organizationId: org.id, userId: owner },
        (tx) =>
          tx.client.query(
            "DELETE FROM learning_content.skill_map_prerequisites WHERE skill_map_version_id=$1",
            [version]
          )
      )
    ).rejects.toMatchObject({ code: "55000" });
    await expect(
      withTenantTransaction(
        runtime,
        { organizationId: org.id, userId: owner },
        (tx) =>
          tx.client.query(
            "DELETE FROM learning_content.skill_map_versions WHERE id=$1",
            [version]
          )
      )
    ).rejects.toMatchObject({ code: "55000" });
  });

  it("isolates maps by organization under RLS", async () => {
    await withTenantTransaction(
      runtime,
      { organizationId: other.id, userId: stranger },
      async (tx) => {
        for (const table of [
          "skill_maps",
          "skill_map_versions",
          "skill_map_prerequisites"
        ])
          expect(
            (
              await tx.client.query(
                `SELECT 1 FROM learning_content.${table} WHERE organization_id=$1`,
                [org.id]
              )
            ).rowCount
          ).toBe(0);
      }
    );
    // The other organization has its own, still empty, public map.
    expect((await publicMap(other.slug)).map).toBeNull();
  });
});
