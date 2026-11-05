import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  createFeedbackReportResponseSchema,
  feedbackReportListSchema,
  feedbackReportSchema
} from "@platform/contracts";
import { createDatabasePool, withTenantTransaction } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";
import { createTestOrganization } from "./test-support/create-test-organization";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} required.`);
  return value;
}

// ADR-0083: anonymous and signed-in reports, exact Origin, rate limit,
// server-set page context, tenant RLS and owner/admin-only Studio access.
describe("feedback HTTP + PostgreSQL boundary", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL"));
  const runtime = createDatabasePool(env("DATABASE_URL"));
  const origin = "https://learning.example.test";
  const saved = {
    origin: process.env.WEB_APP_ORIGIN,
    key: process.env.RATE_LIMIT_KEY,
    vercel: process.env.VERCEL,
    sha: process.env.VERCEL_GIT_COMMIT_SHA
  };
  let app: NestFastifyApplication;
  let owner = "";
  let learner = "";
  let otherOwner = "";
  let org = { id: "", slug: "" };
  let otherOrg = { id: "", slug: "" };
  let addressCounter = 0;

  const newAddress = () =>
    `198.18.${String(Math.floor(Math.random() * 250))}.${String(++addressCounter)}`;

  const report = (extra: object = {}) => ({
    organizationSlug: org.slug,
    kind: "problem",
    text: "Кнопка «Проверить» ничего не делает",
    expected: "Увидеть результат проверки",
    actual: "Ничего не произошло",
    path: "/courses/html-basics/first-tag",
    device: "desktop",
    ...extra
  });

  async function submit(
    payload: object,
    options: { user?: string; origin?: string | null; address?: string } = {}
  ) {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-vercel-forwarded-for": options.address ?? newAddress()
    };
    if (options.origin !== null) headers.origin = options.origin ?? origin;
    if (options.user) headers["x-test-user-id"] = options.user;
    return app.inject({
      method: "POST",
      url: "/v1/feedback",
      headers,
      payload
    });
  }

  async function studio(
    method: "GET" | "PATCH",
    path: string,
    user: string | null,
    payload?: object
  ) {
    const headers: Record<string, string> = { origin };
    if (user) headers["x-test-user-id"] = user;
    return app.inject({
      method,
      url: `/v1/organizations/${path}`,
      headers,
      ...(payload ? { payload } : {})
    });
  }

  async function storedRow(id: string) {
    return (
      await migration.query<Record<string, unknown>>(
        "SELECT * FROM feedback.reports WHERE id = $1",
        [id]
      )
    ).rows[0];
  }

  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = origin;
    process.env.RATE_LIMIT_KEY = `integration-${randomUUID()}`;
    process.env.VERCEL = "1";
    process.env.VERCEL_GIT_COMMIT_SHA = "abcdef0123456789abcdef";
    const users: string[] = [];
    for (const name of ["Feedback owner", "Feedback learner", "Other owner"])
      users.push(
        (
          await migration.query<{ id: string }>(
            "INSERT INTO identity.users(email,display_name) VALUES($1,$2) RETURNING id::text",
            [`${randomUUID()}@example.test`, name]
          )
        ).rows[0]!.id
      );
    [owner, learner, otherOwner] = [users[0]!, users[1]!, users[2]!];
    org = await createTestOrganization(migration, owner, {
      slug: `feedback-${randomUUID()}`,
      name: "Feedback academy"
    });
    otherOrg = await createTestOrganization(migration, otherOwner, {
      slug: `feedback-other-${randomUUID()}`,
      name: "Other academy"
    });
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
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();
    await migration.end();
    await runtime.end();
    for (const [name, value] of [
      ["WEB_APP_ORIGIN", saved.origin],
      ["RATE_LIMIT_KEY", saved.key],
      ["VERCEL", saved.vercel],
      ["VERCEL_GIT_COMMIT_SHA", saved.sha]
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("stores an anonymous report with server-set page context and its event", async () => {
    const response = await submit(report());
    expect(response.statusCode, response.body).toBe(201);
    const { id } = createFeedbackReportResponseSchema.parse(response.json());

    const row = await storedRow(id);
    expect(row).toMatchObject({
      organization_id: org.id,
      user_id: null,
      kind: "problem",
      body: "Кнопка «Проверить» ничего не делает",
      expected: "Увидеть результат проверки",
      actual: "Ничего не произошло",
      page_route: "/courses/[course]/[lesson]",
      course_slug: "html-basics",
      lesson_slug: "first-tag",
      release: "abcdef012345",
      device: "desktop",
      status: "new",
      owner_note: null
    });

    const events = await migration.query<{
      payload: Record<string, unknown>;
      actor_user_id: string | null;
    }>(
      "SELECT payload, actor_user_id FROM events.outbox WHERE event_name='feedback_report.submitted' AND aggregate_id=$1",
      [id]
    );
    expect(events.rows).toHaveLength(1);
    expect(events.rows[0]!.actor_user_id).toBeNull();
    expect(events.rows[0]!.payload).toMatchObject({
      reportId: id,
      kind: "problem",
      route: "/courses/[course]/[lesson]",
      signedIn: false
    });
    expect(JSON.stringify(events.rows[0]!.payload)).not.toContain("Кнопка");
  });

  it("stores the user of a signed-in report", async () => {
    const response = await submit(
      report({
        kind: "idea",
        text: "Добавьте тёмную тему для редактора",
        expected: undefined,
        actual: undefined,
        path: "/learn/some-org/html-free/first-tag",
        device: undefined
      }),
      { user: learner }
    );
    expect(response.statusCode, response.body).toBe(201);
    const row = await storedRow(
      createFeedbackReportResponseSchema.parse(response.json()).id
    );
    expect(row).toMatchObject({
      user_id: learner,
      kind: "idea",
      expected: null,
      actual: null,
      page_route: "/learn/[organization]/[offering]/[lesson]",
      course_slug: null,
      lesson_slug: "first-tag",
      device: null
    });
  });

  it("never stores a raw URL, query or unknown path", async () => {
    const withQuery = await submit(
      report({ path: "/courses/html-basics/first-tag?token=secret" })
    );
    expect(withQuery.statusCode).toBe(400);
    const absolute = await submit(
      report({ path: "https://evil.example/courses" })
    );
    expect(absolute.statusCode).toBe(400);

    const odd = await submit(report({ path: "/studio/private-thing/x" }));
    expect(odd.statusCode, odd.body).toBe(201);
    const row = await storedRow(
      createFeedbackReportResponseSchema.parse(odd.json()).id
    );
    expect(row).toMatchObject({
      page_route: "other",
      course_slug: null,
      lesson_slug: null
    });
    const columns = await migration.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='feedback' AND table_name='reports'"
    );
    expect(columns.rows.map((c) => c.column_name)).not.toEqual(
      expect.arrayContaining(["url", "path", "ip", "user_agent"])
    );
    const leaked = await migration.query(
      "SELECT 1 FROM feedback.reports WHERE row_to_json(reports)::text LIKE '%private-thing%' OR row_to_json(reports)::text LIKE '%token=secret%'"
    );
    expect(leaked.rowCount).toBe(0);
  });

  it("validates the body", async () => {
    for (const payload of [
      report({ text: "коротко" }),
      report({ text: "x".repeat(4001) }),
      report({ kind: "bug" }),
      report({ kind: "unclear", expected: "что-то" }),
      report({ device: "tablet" }),
      report({ release: "fake" }),
      report({ organizationSlug: "Not A Slug" })
    ])
      expect((await submit(payload)).statusCode).toBe(400);
    expect(
      (await submit(report({ organizationSlug: `missing-${randomUUID()}` })))
        .statusCode
    ).toBe(404);
  });

  it("refuses a missing or foreign Origin", async () => {
    expect((await submit(report(), { origin: null })).statusCode).toBe(403);
    expect(
      (await submit(report(), { origin: "https://evil.example" })).statusCode
    ).toBe(403);
    expect(
      (await submit(report(), { origin: null, user: learner })).statusCode
    ).toBe(403);
  });

  it("limits reports to 10 per hour per address", async () => {
    const address = newAddress();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++)
      statuses.push((await submit(report(), { address })).statusCode);
    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect((await submit(report())).statusCode).toBe(201);
  });

  it("isolates tenants under RLS", async () => {
    await submit(report({ organizationSlug: otherOrg.slug }));
    const visible = await withTenantTransaction(
      runtime,
      { organizationId: org.id, userId: owner },
      async (tx) =>
        (
          await tx.client.query<{ organization_id: string }>(
            "SELECT organization_id::text FROM feedback.reports"
          )
        ).rows
    );
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((row) => row.organization_id === org.id)).toBe(true);

    await expect(
      withTenantTransaction(
        runtime,
        { organizationId: org.id, userId: owner },
        (tx) =>
          tx.client.query(
            "INSERT INTO feedback.reports (organization_id, kind, body, page_route, release) VALUES ($1,'idea','Чужая организация','other','local')",
            [otherOrg.id]
          )
      )
    ).rejects.toThrow(/row-level security/);
    await expect(
      withTenantTransaction(
        runtime,
        { organizationId: org.id, userId: owner },
        (tx) =>
          tx.client.query(
            "INSERT INTO feedback.reports (organization_id, user_id, kind, body, page_route, release) VALUES ($1,$2,'idea','Чужой пользователь','other','local')",
            [org.id, learner]
          )
      )
    ).rejects.toThrow(/row-level security/);
    await expect(
      withTenantTransaction(
        runtime,
        { organizationId: org.id, userId: owner },
        (tx) => tx.client.query("DELETE FROM feedback.reports")
      )
    ).rejects.toThrow(/permission denied/);
  });

  it("lets only owners and admins list and triage reports", async () => {
    expect((await studio("GET", `${org.id}/feedback`, null)).statusCode).toBe(
      401
    );
    expect(
      (await studio("GET", `${org.id}/feedback`, learner)).statusCode
    ).toBe(403);
    expect(
      (await studio("GET", `${org.id}/feedback`, otherOwner)).statusCode
    ).toBe(403);

    const list = await studio(
      "GET",
      `${org.id}/feedback?kind=problem&lessonSlug=first-tag&status=new`,
      owner
    );
    expect(list.statusCode, list.body).toBe(200);
    const reports = feedbackReportListSchema.parse(list.json()).reports;
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((r) => r.kind === "problem")).toBe(true);
    expect(reports.every((r) => r.lessonSlug === "first-tag")).toBe(true);
    const ids = reports.map((r) => r.id);
    expect([...ids].sort().reverse()).toEqual(ids);

    const target = reports[0]!;
    const patched = await studio(
      "PATCH",
      `${org.id}/feedback/${target.id}`,
      owner,
      { status: "accepted", ownerNote: "Исправим в следующем релизе" }
    );
    expect(patched.statusCode, patched.body).toBe(200);
    expect(feedbackReportSchema.parse(patched.json())).toMatchObject({
      id: target.id,
      status: "accepted",
      ownerNote: "Исправим в следующем релизе"
    });
    const triaged = await migration.query<{ payload: Record<string, unknown> }>(
      "SELECT payload FROM events.outbox WHERE event_name='feedback_report.triaged' AND aggregate_id=$1",
      [target.id]
    );
    expect(triaged.rows.map((r) => r.payload)).toEqual([
      expect.objectContaining({
        previousStatus: "new",
        status: "accepted",
        noteChanged: true
      })
    ]);

    expect(
      (
        await studio("PATCH", `${org.id}/feedback/${target.id}`, learner, {
          status: "done"
        })
      ).statusCode
    ).toBe(403);
    expect(
      (
        await studio("PATCH", `${otherOrg.id}/feedback/${target.id}`, otherOwner, {
          status: "done"
        })
      ).statusCode
    ).toBe(404);
    expect(
      (
        await studio("PATCH", `${org.id}/feedback/${target.id}`, owner, {})
      ).statusCode
    ).toBe(400);
    const foreignOrigin = await app.inject({
      method: "PATCH",
      url: `/v1/organizations/${org.id}/feedback/${target.id}`,
      headers: { origin: "https://evil.example", "x-test-user-id": owner },
      payload: { status: "done" }
    });
    expect(foreignOrigin.statusCode).toBe(403);
  });
});
