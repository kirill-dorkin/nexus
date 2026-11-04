import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  courseManifestV1Schema,
  ownOrganizationsSchema,
  studioCourseListSchema,
  studioDraftSchema,
  type CourseManifestV1,
  type StudioDraft,
  currentRegistrationConsents
} from "@platform/contracts";
import {
  createDatabasePool,
  withUserTransaction,
  withTenantTransaction,
  withTransaction
} from "@platform/database";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApiApplication } from "./app.factory";
import { OutboxRepository } from "./outbox/outbox.repository";
function env(name: string) {
  const value = process.env[name];
  if (!value) throw Error(`${name} required`);
  return value;
}
describe("Studio real-session HTTP + PostgreSQL boundary", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL")),
    runtime = createDatabasePool(env("DATABASE_URL"));
  const origin = "https://studio.example.test",
    oldOrigin = process.env.WEB_APP_ORIGIN;
  let app: NestFastifyApplication,
    org: string,
    foreignOrg: string,
    course: string,
    otherCourse: string,
    owner: string,
    learner: string,
    instructor: string,
    foreign: string;
  const actors = new Map<string, string>(),
    users: string[] = [],
    organizations: string[] = [];
  let manifest: CourseManifestV1, published: StudioDraft;
  async function request(
    method: "GET" | "POST",
    path: string,
    payload?: object,
    actor = owner,
    expected = 200,
    suppliedOrigin = origin
  ) {
    const r = await app.inject({
      method,
      url: `/v1/${path}`,
      headers: {
        origin: suppliedOrigin,
        ...(actor ? { cookie: actors.get(actor)! } : {})
      },
      ...(payload ? { payload } : {})
    });
    expect(r.statusCode, r.body).toBe(expected);
    return r;
  }
  const studio = (id = course, o = org) =>
    `organizations/${o}/studio/courses/${id}`;
  async function draft(id = course) {
    return studioDraftSchema.parse((await request("GET", studio(id))).json());
  }
  async function apply(m = manifest) {
    const plan = (
      await request("POST", `organizations/${org}/courses/manifest/validate`, m)
    ).json();
    return (
      await request("POST", `organizations/${org}/courses/manifest/apply`, {
        manifest: m,
        expectedDraftVersionId: plan.expectedDraftVersionId,
        expectedRevision: plan.expectedRevision
      })
    ).json();
  }
  async function counts() {
    return (
      await migration.query(
        "SELECT (SELECT count(*) FROM learning_content.course_versions WHERE organization_id=$1)::int versions,(SELECT count(*) FROM events.outbox WHERE organization_id=$1)::int events",
        [org]
      )
    ).rows[0];
  }
  async function assignCourseFixture(courseId: string) {
    await migration.query(
      "INSERT INTO access_control.role_assignments (organization_id,user_id,role_id,scope_type,scope_id,assigned_by_user_id) SELECT $1,$2,id,'course',$3,$4 FROM access_control.roles WHERE key='instructor' AND is_system=true",
      [org, instructor, courseId, owner]
    );
  }
  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = origin;
    app = await createApiApplication();
    await app.init();
    for (let i = 0; i < 4; i++) {
      const r = await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        headers: { origin },
        payload: {
          email: `studio-${randomUUID()}@example.test`,
          password: "StudioIntegration!12345",
          consents: currentRegistrationConsents()
        }
      });
      expect(r.statusCode, r.body).toBe(201);
      const user = r.json().id;
      users.push(user);
      actors.set(user, String(r.headers["set-cookie"]).split(";")[0]!);
    }
    [owner, learner, instructor, foreign] = users as [
      string,
      string,
      string,
      string
    ];
    // Isolated migration-role fixtures never use user-session Organization writes.
    for (const actor of [owner, foreign]) {
      const slug = `studio-${randomUUID()}`;
      const id = await withTransaction(migration, async ({ client }) => {
        const inserted = await client.query<{ id: string }>(
          "INSERT INTO organizations.organizations (slug,name,created_by_user_id) VALUES ($1,$2,$3) RETURNING id::text",
          [slug, "Studio academy", actor]
        );
        const organizationId = inserted.rows[0]!.id;
        await client.query(
          "INSERT INTO organizations.memberships (organization_id,user_id,status,joined_at) VALUES ($1,$2,'active',now())",
          [organizationId, actor]
        );
        await client.query(
          "INSERT INTO access_control.role_assignments (organization_id,user_id,role_id,scope_type,scope_id,assigned_by_user_id) SELECT $1,$2,id,'organization',$1,$2 FROM access_control.roles WHERE key='organization_owner' AND is_system=true",
          [organizationId, actor]
        );
        await client.query(
          "INSERT INTO events.outbox (organization_id,event_name,event_version,aggregate_type,aggregate_id,actor_user_id,payload) VALUES ($1,'organization.created',1,'organization',$1,$2,$3::jsonb)",
          [
            organizationId,
            actor,
            JSON.stringify({
              organizationId,
              slug,
              name: "Studio academy",
              createdByUserId: actor
            })
          ]
        );
        return organizationId;
      });
      organizations.push(id);
    }
    [org, foreignOrg] = organizations as [string, string];
    manifest = courseManifestV1Schema.parse(
      JSON.parse(
        readFileSync("docs/examples/computer-basics.manifest.json", "utf8")
      )
    );
    manifest.course.slug = `studio-${randomUUID()}`;
    manifest.activities[0]!.validation.explanation =
      "PRIVATE_STUDIO_EXPLANATION";
    manifest.activities.push(
      {
        slug: "multi-check",
        type: "quiz.multiple_choice",
        title: "Мультивыбор",
        instructions: "Два ответа",
        skillKeys: [manifest.skills[0]!.key],
        presentation: {
          question: "Два компонента",
          options: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
            { id: "c", text: "C" }
          ]
        },
        validation: {
          correctOptionIds: ["a", "c"],
          explanation: "PRIVATE_MULTI"
        }
      },
      {
        slug: "text-check",
        type: "quiz.short_text",
        title: "Текст",
        instructions: "Введите ответ",
        skillKeys: [manifest.skills[0]!.key],
        presentation: { question: "Название" },
        validation: {
          acceptedAnswers: ["PRIVATE_ACCEPTED_TEXT", "Вариант"],
          caseSensitive: true,
          explanation: "PRIVATE_TEXT"
        }
      }
    );
    manifest.lessons.push({
      slug: "second-lesson",
      title: "Второй урок",
      summary: "Второй",
      durationMinutes: 20,
      blocks: [
        {
          type: "activity",
          activitySlug: "multi-check",
          title: "Блок домашней работы",
          kind: "homework",
          required: false
        },
        {
          type: "activity",
          activitySlug: "text-check",
          kind: "practice",
          required: true
        }
      ]
    });
    course = (await apply()).courseId;
    const second = structuredClone(manifest);
    second.course.slug = `other-${randomUUID()}`;
    otherCourse = (await apply(second)).courseId;
    for (const actor of [learner, instructor]) {
      await request(
        "POST",
        `organizations/${org}/memberships`,
        { userId: actor },
        owner,
        201
      );
      await request(
        "POST",
        `organizations/${org}/memberships/me/accept`,
        {},
        actor
      );
    }
    // Course-scoped assignments are supported by persisted authorization policy;
    // the existing HTTP role-management surface deliberately exposes only org scope.
    await assignCourseFixture(course);
  });
  afterAll(async () => {
    if (app) await app.close();
    for (const id of organizations) {
      await migration.query(
        "DELETE FROM events.outbox WHERE organization_id=$1",
        [id]
      );
      for (const table of [
        "course_version_lesson_blocks",
        "course_version_lessons",
        "quiz_validation_configs",
        "activity_skill_mappings",
        "course_version_activities",
        "course_version_skills",
        "activities",
        "skills",
        "courses"
      ]) {
        await migration.query(
          `DELETE FROM learning_content.${table} WHERE organization_id=$1`,
          [id]
        );
      }
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
    if (oldOrigin === undefined) delete process.env.WEB_APP_ORIGIN;
    else process.env.WEB_APP_ORIGIN = oldOrigin;
  });
  it("discovers only own active organizations with the real API cookie and strict actor-free query", async () => {
    const r = await request("GET", "me/organizations");
    expect(r.headers["cache-control"]).toBe("no-store");
    const data = ownOrganizationsSchema.parse(r.json());
    expect(data.organizations.map((o) => o.id)).toContain(org);
    expect(data.organizations.map((o) => o.id)).not.toContain(foreignOrg);
    await request(
      "GET",
      `me/organizations?userId=${foreign}`,
      undefined,
      owner,
      400
    );
    await request("GET", "me/organizations", undefined, "", 401);
    await withUserTransaction(runtime, { userId: owner }, async (tx) => {
      expect(
        (
          await tx.client.query(
            "SELECT id FROM organizations.list_own_active_organizations(NULL)"
          )
        ).rows.map((r) => r.id)
      ).not.toContain(foreignOrg);
      expect(
        (await tx.client.query("SELECT id FROM organizations.organizations"))
          .rows
      ).toEqual([]);
    });
    await withUserTransaction(runtime, { userId: randomUUID() }, async (tx) =>
      expect(
        (
          await tx.client.query(
            "SELECT * FROM organizations.list_own_active_organizations(NULL)"
          )
        ).rows
      ).toEqual([])
    );
  });
  it("denies user-session tenant creation through both legacy URLs even for owners", async () => {
    const registration = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      headers: { origin },
      payload: {
        email: `new-learner-${randomUUID()}@example.test`,
        password: "StudioIntegration!12345",
        consents: currentRegistrationConsents()
      }
    });
    expect(registration.statusCode).toBe(201);
    const newcomer: string = registration.json().id;
    users.push(newcomer);
    actors.set(
      newcomer,
      String(registration.headers["set-cookie"]).split(";")[0]!
    );
    const rejectedSlug = `rejected-studio-${randomUUID()}`;
    for (const path of ["me/organizations", "organizations"]) {
      for (const actor of [owner, learner, instructor, foreign, newcomer]) {
        await request(
          "POST",
          path,
          { slug: rejectedSlug, name: "Unauthorized Academy" },
          actor,
          403
        );
      }
      await request(
        "POST",
        path,
        { slug: rejectedSlug, name: "Unauthorized Academy", userId: foreign },
        owner,
        403
      );
      await request(
        "POST",
        path,
        { slug: rejectedSlug, name: "Unauthorized Academy" },
        "",
        401
      );
    }
    await request(
      "POST",
      "me/organizations",
      { slug: rejectedSlug, name: "Unauthorized Academy" },
      owner,
      403,
      "https://wrong.example.test"
    );
    const persisted = await migration.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM organizations.organizations WHERE slug=$1",
      [rejectedSlug]
    );
    expect(persisted.rows[0]?.count).toBe("0");
  });
  it("filters courses by resource-scoped capabilities without leaking protected material", async () => {
    const own = studioCourseListSchema.parse(
      (await request("GET", `organizations/${org}/studio/courses`)).json()
    );
    expect(own.canCreate).toBe(true);
    expect(own.courses.map((c) => c.courseId)).toEqual(
      expect.arrayContaining([course, otherCourse])
    );
    const scoped = studioCourseListSchema.parse(
      (
        await request(
          "GET",
          `organizations/${org}/studio/courses`,
          undefined,
          instructor
        )
      ).json()
    );
    expect(scoped.courses.map((c) => c.courseId)).toEqual([course]);
    expect(scoped.canCreate).toBe(false);
    expect(JSON.stringify(own)).not.toContain("PRIVATE_");
    await request(
      "GET",
      `organizations/${org}/studio/courses?actorId=${foreign}`,
      undefined,
      owner,
      400
    );
  });
  it("denies role-less learners, foreign courses, anonymous authoring and course read without manage", async () => {
    await request("GET", studio(), undefined, learner, 403);
    await request(
      "GET",
      `organizations/${org}/studio/courses`,
      undefined,
      learner,
      403
    );
    await request("GET", studio(otherCourse), undefined, instructor, 403);
    await request("GET", studio(), undefined, "", 401);
    await request("GET", studio(course, foreignOrg), undefined, foreign, 404);
    await request("GET", studio(course, foreignOrg), undefined, owner, 403);
    await withTenantTransaction(
      runtime,
      { organizationId: foreignOrg, userId: foreign },
      async (tx) =>
        expect(
          (
            await tx.client.query(
              "SELECT id FROM learning_content.course_versions WHERE course_id=$1",
              [course]
            )
          ).rows
        ).toEqual([])
    );
  });
  it("exports all manual/JSON features and concurrency tokens in one protected read-only snapshot", async () => {
    const before = await counts(),
      d = await draft();
    expect(d.manifest).toEqual(manifest);
    expect(d.canApply).toBe(true);
    expect(d.canPublish).toBe(true);
    expect(d.revision).toBeGreaterThan(0);
    expect(await counts()).toEqual(before);
    const scoped = studioDraftSchema.parse(
      (await request("GET", studio(), undefined, instructor)).json()
    );
    expect(scoped.canApply).toBe(false);
    expect(scoped.canPublish).toBe(true);
    expect((await request("GET", studio())).headers["cache-control"]).toBe(
      "no-store"
    );
  });
  it("validates edited fields without mutation and applies the exact same canonical manifest", async () => {
    const edit = structuredClone(manifest);
    edit.course.title = "Ручное редактирование";
    edit.course.description = "Новое описание";
    edit.skills[0]!.title = "Название навыка";
    edit.skills[0]!.description = "Описание навыка";
    edit.activities[0]!.title = "Новая практика";
    edit.activities[0]!.instructions = "## Инструкция";
    edit.activities[0]!.presentation.question = "Новый вопрос";
    edit.activities[0]!.validation.explanation = "PRIVATE_UPDATED";
    if (edit.activities[0]!.type === "quiz.single_choice") {
      edit.activities[0]!.presentation.options.reverse();
      edit.activities[0]!.validation.correctOptionId = "ram";
    }
    if (edit.activities[2]!.type === "quiz.short_text") {
      edit.activities[2]!.validation.acceptedAnswers.push("Третий ответ");
      edit.activities[2]!.validation.caseSensitive = false;
    }
    edit.lessons.reverse();
    edit.lessons[0]!.summary = "Изменённое описание";
    edit.lessons[0]!.durationMinutes = 31;
    edit.lessons[0]!.blocks.reverse();
    const before = await counts();
    await request(
      "POST",
      `organizations/${org}/courses/manifest/validate`,
      edit
    );
    expect(await counts()).toEqual(before);
    await apply(edit);
    manifest = edit;
    expect((await draft()).manifest).toEqual(edit);
  });
  it("does not publish a stale preview or accept caller version/outcome authority", async () => {
    const before = await counts(),
      d = await draft();
    await request(
      "POST",
      `${studio()}/publish`,
      { draftVersionId: d.versionId, expectedRevision: d.revision - 1 },
      owner,
      409
    );
    expect(await counts()).toEqual(before);
    await request(
      "POST",
      `${studio()}/publish`,
      {
        draftVersionId: d.versionId,
        expectedRevision: d.revision,
        userId: foreign
      },
      owner,
      400
    );
    await request(
      "POST",
      `${studio()}/publish`,
      { draftVersionId: d.versionId, expectedRevision: d.revision },
      owner,
      403,
      "https://wrong.example.test"
    );
    await request(
      "POST",
      `${studio()}/publish`,
      { draftVersionId: d.versionId, expectedRevision: d.revision },
      learner,
      403
    );
    expect((await draft()).status).toBe("draft");
  });
  it("rolls publication and its outbox back atomically", async () => {
    const d = await draft(),
      before = await counts(),
      outbox = app.get(OutboxRepository),
      original = outbox.append.bind(outbox);
    const spy = vi
      .spyOn(outbox, "append")
      .mockImplementation(async (tx, event) => {
        if (event.eventName === "course_version.published")
          throw Error("controlled Studio publication rollback");
        return original(tx, event);
      });
    try {
      await request(
        "POST",
        `${studio()}/publish`,
        { draftVersionId: d.versionId, expectedRevision: d.revision },
        owner,
        500
      );
    } finally {
      spy.mockRestore();
    }
    expect((await draft()).status).toBe("draft");
    expect(await counts()).toEqual(before);
  });
  it("publishes only the saved revision and keeps authoring answers out of events", async () => {
    const d = await draft();
    await request("POST", `${studio()}/publish`, {
      draftVersionId: d.versionId,
      expectedRevision: d.revision
    });
    published = await draft();
    expect(published.status).toBe("published");
    expect(published.manifest).toEqual(manifest);
    const events = (
      await migration.query(
        "SELECT event_name,payload FROM events.outbox WHERE organization_id=$1",
        [org]
      )
    ).rows;
    expect(
      events.filter((e) => e.event_name === "course_version.published")
    ).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain("PRIVATE_");
    await request(
      "POST",
      `${studio()}/publish`,
      { draftVersionId: d.versionId, expectedRevision: d.revision },
      owner,
      409
    );
  });
  it("creates a next draft explicitly through the same importer and preserves immutable history/stable identities", async () => {
    const oldLessons = (
      await migration.query(
        "SELECT lesson_id FROM learning_content.course_version_lessons WHERE course_version_id=$1 ORDER BY position",
        [published.versionId]
      )
    ).rows;
    await request("POST", `${studio()}/draft`, { userId: foreign }, owner, 400);
    await request("POST", `${studio()}/draft`, {}, learner, 403);
    await request("POST", `${studio()}/draft`, {}, instructor, 403);
    await request("POST", `${studio()}/draft`, {}, owner, 201);
    const next = await draft();
    expect(next.status).toBe("draft");
    expect(next.versionNumber).toBe(2);
    expect(next.manifest).toEqual(published.manifest);
    expect(next.versionId).not.toBe(published.versionId);
    expect(
      (
        await migration.query(
          "SELECT lesson_id FROM learning_content.course_version_lessons WHERE course_version_id=$1 ORDER BY position",
          [next.versionId]
        )
      ).rows
    ).toEqual(oldLessons);
    await request("POST", `${studio()}/draft`, {}, owner, 409);
    const edit = structuredClone(manifest);
    edit.course.title = "Версия 2";
    await apply(edit);
    manifest = edit;
    expect(
      (
        await migration.query(
          "SELECT title FROM learning_content.course_versions WHERE id=$1",
          [published.versionId]
        )
      ).rows[0].title
    ).toBe(published.manifest.course.title);
  });
  it("serializes a concurrent save/publication without publishing unseen changes", async () => {
    const d = await draft(otherCourse),
      edit = structuredClone(d.manifest);
    edit.course.title = "Concurrent edit";
    const plan = (
      await request(
        "POST",
        `organizations/${org}/courses/manifest/validate`,
        edit
      )
    ).json();
    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: `/v1/organizations/${org}/courses/manifest/apply`,
        headers: { origin, cookie: actors.get(owner)! },
        payload: {
          manifest: edit,
          expectedDraftVersionId: plan.expectedDraftVersionId,
          expectedRevision: plan.expectedRevision
        }
      }),
      app.inject({
        method: "POST",
        url: `/v1/${studio(otherCourse)}/publish`,
        headers: { origin, cookie: actors.get(owner)! },
        payload: { draftVersionId: d.versionId, expectedRevision: d.revision }
      })
    ]);
    expect(responses.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const current = await draft(otherCourse);
    expect(current.manifest.course.title).toBe(
      current.status === "published" ? d.title : edit.course.title
    );
  });
  it("keyset pagination covers more than 100 own organizations and authorized courses without duplicates", async () => {
    const suffix = randomUUID();
    const extra = (
      await migration.query<{ id: string }>(
        "INSERT INTO organizations.organizations (slug,name,created_by_user_id) SELECT concat('page-', $1::text, '-', n), 'Pagination', $2::uuid FROM generate_series(1,103) n RETURNING id::text",
        [suffix, owner]
      )
    ).rows.map((r) => r.id);
    organizations.push(...extra);
    await migration.query(
      "INSERT INTO organizations.memberships (organization_id,user_id,status,joined_at) SELECT unnest($1::uuid[]),$2,'active',now()",
      [extra, owner]
    );
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const data = ownOrganizationsSchema.parse(
        (
          await request(
            "GET",
            `me/organizations${cursor ? `?after=${cursor}` : ""}`
          )
        ).json()
      );
      seen.push(...data.organizations.map((o) => o.id));
      cursor = data.nextCursor;
    } while (cursor);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toEqual(expect.arrayContaining([org, ...extra]));
    expect(seen).not.toContain(foreignOrg);
    const ids = (
      await migration.query<{ id: string }>(
        "INSERT INTO learning_content.courses (organization_id,slug,created_by_user_id) SELECT $1,concat('page-',n),$2 FROM generate_series(1,103) n RETURNING id::text",
        [org, owner]
      )
    ).rows.map((r) => r.id);
    await migration.query(
      "INSERT INTO learning_content.course_versions (organization_id,course_id,version_number,title,created_by_user_id) SELECT $1,unnest($2::uuid[]),1,'Pagination',$3",
      [org, ids, owner]
    );
    const courses: string[] = [];
    cursor = null;
    do {
      const data = studioCourseListSchema.parse(
        (
          await request(
            "GET",
            `organizations/${org}/studio/courses${cursor ? `?after=${cursor}` : ""}`
          )
        ).json()
      );
      courses.push(...data.courses.map((c) => c.courseId));
      cursor = data.nextCursor;
    } while (cursor);
    expect(new Set(courses).size).toBe(courses.length);
    expect(courses).toHaveLength(105);
    await assignCourseFixture(ids[102]!);
    const scoped = studioCourseListSchema.parse(
      (
        await request(
          "GET",
          `organizations/${org}/studio/courses`,
          undefined,
          instructor
        )
      ).json()
    );
    expect(scoped.courses.map((c) => c.courseId)).toEqual(
      expect.arrayContaining([course, ids[102]!])
    );
    expect(scoped.courses).toHaveLength(2);
    expect(scoped.nextCursor).toBeNull();
  });
  it("fails closed for inactive identity and suspended own membership discovery/authoring", async () => {
    await migration.query(
      "UPDATE organizations.memberships SET status='suspended' WHERE organization_id=$1 AND user_id=$2",
      [org, instructor]
    );
    expect(
      ownOrganizationsSchema
        .parse(
          (
            await request("GET", "me/organizations", undefined, instructor)
          ).json()
        )
        .organizations.map((o) => o.id)
    ).not.toContain(org);
    await request("GET", studio(), undefined, instructor, 403);
    await migration.query(
      "UPDATE identity.users SET status='suspended' WHERE id=$1",
      [owner]
    );
    await request("GET", "me/organizations", undefined, owner, 401);
    await request("GET", studio(), undefined, owner, 401);
    await migration.query(
      "UPDATE identity.users SET status='active' WHERE id=$1",
      [owner]
    );
  });
});
