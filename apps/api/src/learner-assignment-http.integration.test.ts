import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  assignmentCheckResultSchema,
  courseManifestV1Schema,
  publicLearningLessonSchema,
  type CourseManifestV1
} from "@platform/contracts";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";
import { createTestOrganization } from "./test-support/create-test-organization";

// ADR-0073: a learner uploads the files of a file assignment and gets a
// trusted, per-check answer; the checks and the reference solution never leak.

function env(name: string) {
  const value = process.env[name];
  if (!value) throw Error(`${name} required`);
  return value;
}

const SOLUTION_SECRET = `SOLUTION_SECRET_${randomUUID()}`;
const CHECK_SECRET = `CHECK_SELECTOR_SECRET_${randomUUID().slice(0, 8)}`;

function assignmentManifest(slug: string): CourseManifestV1 {
  return courseManifestV1Schema.parse({
    schemaVersion: 1,
    course: { slug, title: "Страница из файлов" },
    skills: [{ key: "html-headings", title: "Заголовки" }],
    activities: [
      {
        slug: "first-page",
        title: "Первая страница",
        instructions: "Сделайте страницу с заголовком.",
        type: "assignment.files",
        skillKeys: ["html-headings"],
        presentation: {
          lang: "html",
          starterFiles: {
            "index.html":
              '<!doctype html><link rel="stylesheet" href="style.css"><p>Текст</p>',
            "style.css": ""
          },
          allowedFiles: ["index.html", "style.css"]
        },
        validation: {
          checks: [
            { label: "Есть заголовок первого уровня", selector: "h1" },
            {
              label: "Заголовок красный",
              css: { selector: "h1", property: "color", value: "red" },
              hint: "Задайте цвет в style.css."
            },
            {
              label: "Нет служебного блока",
              selector: `.${CHECK_SECRET}`,
              absent: true
            }
          ],
          solutionFiles: {
            "index.html": `<!doctype html><link rel="stylesheet" href="style.css"><h1>Привет</h1><!-- ${SOLUTION_SECRET} -->`,
            "style.css": "h1 { color: red; }"
          }
        }
      }
    ],
    lessons: [
      {
        slug: "start",
        title: "Старт",
        durationMinutes: 10,
        blocks: [
          { type: "markdown", markdown: "## Задание" },
          {
            type: "activity",
            activitySlug: "first-page",
            kind: "homework",
            required: true
          }
        ]
      }
    ]
  });
}

describe("learner file assignment HTTP + PostgreSQL boundary", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL"));
  const origin = "https://learning.example.test";
  const oldOrigin = process.env.WEB_APP_ORIGIN;
  const users: string[] = [];
  const organizations: string[] = [];
  let app: NestFastifyApplication;
  let owner = "";
  let cookie = "";
  let orgSlug = "";
  let orgId = "";
  const offeringSlug = "files-course";

  async function request(
    method: "POST" | "GET" | "PATCH" | "PUT",
    path: string,
    payload?: object,
    actor: string | null = null,
    expected = 200
  ) {
    const r = await app.inject({
      method,
      url: `/v1/${path}`,
      headers: {
        origin,
        ...(actor ? { "x-test-user-id": actor } : { cookie })
      },
      ...(payload !== undefined ? { payload } : {})
    });
    expect(r.statusCode, r.body).toBe(expected);
    return r;
  }

  const submit = (
    files: Record<string, string>,
    expected = 200,
    attemptKey = randomUUID()
  ) =>
    request(
      "POST",
      `me/learning/${orgSlug}/${offeringSlug}/assignments/first-page/submissions`,
      { attemptKey, files },
      null,
      expected
    );

  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = origin;
    owner = (
      await migration.query<{ id: string }>(
        "INSERT INTO identity.users(email,display_name) VALUES($1,$2) RETURNING id",
        [`${randomUUID()}@example.test`, "Assignment owner"]
      )
    ).rows[0]!.id;
    users.push(owner);
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

    const org = await createTestOrganization(migration, owner, {
      slug: `files-${randomUUID()}`,
      name: "Files academy"
    });
    organizations.push(org.id);
    orgId = org.id;
    orgSlug = org.slug;
    const manifest = assignmentManifest(`files-${randomUUID()}`);
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
          slug: offeringSlug,
          name: "Files offering",
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

    const registered = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      headers: { origin },
      payload: {
        email: `${randomUUID()}@example.test`,
        password: `AssignmentLearner!${randomUUID()}`,
        displayName: "Learner"
      }
    });
    expect(registered.statusCode, registered.body).toBe(201);
    users.push(registered.json().id);
    cookie = String(registered.headers["set-cookie"]).split(";")[0]!;
    await request("POST", `public/organizations/${orgSlug}/memberships/me`, {});
    await request(
      "POST",
      `me/learning/${orgSlug}/${offeringSlug}/enrollment`,
      {}
    );
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
        "learning_content.assignment_check_configs",
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
    await migration.end();
    if (oldOrigin === undefined) delete process.env.WEB_APP_ORIGIN;
    else process.env.WEB_APP_ORIGIN = oldOrigin;
  });

  it("shows the assignment publicly without its checks or solution", async () => {
    const lesson = await request(
      "GET",
      `public/learning/${orgSlug}/${offeringSlug}/lessons/start`
    );
    expect(lesson.body).not.toContain(SOLUTION_SECRET);
    expect(lesson.body).not.toContain(CHECK_SECRET);
    expect(lesson.body).not.toContain("Задайте цвет");
    const content = publicLearningLessonSchema.parse(lesson.json()).lesson;
    const block = content.blocks.find((b) => b.type === "activity");
    expect(block?.type === "activity" && block.activity).toMatchObject({
      type: "assignment.files",
      entry: "index.html",
      allowedFiles: ["index.html", "style.css"],
      checkLabels: [
        "Есть заголовок первого уровня",
        "Заголовок красный",
        "Нет служебного блока"
      ]
    });
  });

  it("names what to fix, then counts a correct try towards the skill", async () => {
    const failed = assignmentCheckResultSchema.parse(
      (
        await submit({
          "index.html": "<p>Текст</p>",
          "style.css": "p { color: blue; }"
        })
      ).json()
    );
    expect(failed).toMatchObject({ outcome: "failed", attemptNumber: 1 });
    expect(failed.checks).toEqual([
      { label: "Есть заголовок первого уровня", passed: false },
      {
        label: "Заголовок красный",
        passed: false,
        hint: "Задайте цвет в style.css."
      },
      { label: "Нет служебного блока", passed: true }
    ]);

    const passed = assignmentCheckResultSchema.parse(
      (
        await submit({
          "index.html": "<h1>Привет</h1>",
          "style.css": "h1 { color: red; }"
        })
      ).json()
    );
    expect(passed).toMatchObject({
      outcome: "passed",
      score: 1,
      attemptNumber: 2
    });

    const evidence = await migration.query<{ score: number; kind: string }>(
      "SELECT score::float AS score,kind FROM learning_progress.evidence WHERE organization_id=$1 ORDER BY created_at,score",
      [orgId]
    );
    expect(evidence.rows.map((row) => [row.kind, row.score])).toEqual([
      ["assignment.files", 0.33333],
      ["assignment.files", 1]
    ]);
  });

  it("replays the same try without a second result", async () => {
    const attemptKey = randomUUID();
    const files = { "index.html": "<h1>Снова</h1>" };
    const first = (await submit(files, 200, attemptKey)).json();
    const again = (await submit(files, 200, attemptKey)).json();
    expect(again).toEqual(first);
    const results = await migration.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM learning_validation.validation_results r JOIN learning_progress.submissions s ON s.organization_id=r.organization_id AND s.id=r.submission_id WHERE s.organization_id=$1 AND s.attempt_id=$2",
      [orgId, attemptKey]
    );
    expect(results.rows[0]?.n).toBe(1);
  });

  it("refuses uploads it cannot check, before storing anything", async () => {
    const before = await migration.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM learning_progress.submissions WHERE organization_id=$1",
      [orgId]
    );
    await submit({ "../index.html": "<h1></h1>" }, 400);
    await submit({ "index.html": "<h1></h1>", "app.js": "alert(1)" }, 400);
    await submit({ "style.css": "h1{}" }, 400);
    await submit({ "index.html": "x".repeat(210 * 1024) }, 400);
    const after = await migration.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM learning_progress.submissions WHERE organization_id=$1",
      [orgId]
    );
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
  });

  it("refuses a manifest whose solution fails its own checks", async () => {
    const broken = assignmentManifest(`broken-${randomUUID()}`);
    const activity = broken.activities[0]!;
    if (activity.type !== "assignment.files")
      throw new Error("assignment expected");
    activity.validation.solutionFiles = {
      "index.html": "<p>нет заголовка</p>"
    };
    const r = await request(
      "POST",
      `organizations/${orgId}/courses/manifest/validate`,
      broken,
      owner,
      400
    );
    expect(r.json()).toMatchObject({
      assignments: [
        {
          activitySlug: "first-page",
          failedChecks: ["Есть заголовок первого уровня", "Заголовок красный"]
        }
      ]
    });
  });

  it("copies the assignment into a new draft and exports it for the author", async () => {
    const version = await migration.query<{ course_id: string; slug: string }>(
      "SELECT c.id::text AS course_id,c.slug FROM learning_content.courses c WHERE c.organization_id=$1",
      [orgId]
    );
    const { course_id: courseId, slug } = version.rows[0]!;
    const manifest = assignmentManifest(slug);
    const plan = (
      await request(
        "POST",
        `organizations/${orgId}/courses/manifest/validate`,
        manifest,
        owner
      )
    ).json();
    const applied = (
      await request(
        "POST",
        `organizations/${orgId}/courses/manifest/apply`,
        {
          manifest,
          expectedDraftVersionId: plan.expectedDraftVersionId,
          expectedRevision: plan.expectedRevision
        },
        owner
      )
    ).json();
    const exported = await request(
      "GET",
      `organizations/${orgId}/courses/${courseId}/versions/${applied.draftVersionId}/manifest`,
      undefined,
      owner
    );
    expect(exported.body).toContain(SOLUTION_SECRET);
    const parsed = courseManifestV1Schema.parse(exported.json());
    expect(parsed.activities[0]?.type).toBe("assignment.files");
  });
});
