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
  const value = process.env[name];
  if (!value) throw new Error(`${name} required`);
  return value;
}

/**
 * ADR-0087 §4: once an organization sells a catalog subscription, quiz checks after the first
 * chapter answer 402 without a subscription or the trial; the first chapter stays free.
 */
describe("subscription paywall on quiz checks", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL"));
  const runtime = createDatabasePool(env("DATABASE_URL"));
  const origin = "https://learning.example.test";
  const previousOrigin = process.env.WEB_APP_ORIGIN;
  let app: NestFastifyApplication;
  let owner = "";
  let learner = "";
  let orgId = "";
  let orgSlug = "";
  const offeringSlug = "git";

  async function request(
    method: "GET" | "POST" | "PATCH" | "PUT",
    path: string,
    actor: string,
    payload?: object
  ) {
    return app.inject({
      method,
      url: `/v1/${path}`,
      headers: { origin, "x-test-user-id": actor },
      ...(payload === undefined ? {} : { payload })
    });
  }

  async function ok(
    method: "GET" | "POST" | "PATCH" | "PUT",
    path: string,
    actor: string,
    payload?: object,
    status = 200
  ) {
    const response = await request(method, path, actor, payload);
    expect(response.statusCode, response.body).toBe(status);
    return response.json<Record<string, unknown>>();
  }

  const check = (activitySlug: string, optionId: string) =>
    request(
      "POST",
      `me/learning/${orgSlug}/${offeringSlug}/quiz/${activitySlug}/check`,
      learner,
      {
        attemptKey: randomUUID(),
        answer: { type: "quiz.single_choice", optionId }
      }
    );

  const ageAccount = (days: number) =>
    migration.query(
      `UPDATE identity.users SET created_at = now() - make_interval(days => $2) WHERE id = $1`,
      [learner, days]
    );

  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = origin;
    const create = async (name: string) =>
      (
        await migration.query<{ id: string }>(
          "INSERT INTO identity.users(email,display_name) VALUES($1,$2) RETURNING id::text",
          [`${randomUUID()}@example.test`, name]
        )
      ).rows[0]!.id;
    owner = await create("Paywall owner");
    learner = await create("Paywall learner");

    app = await createApiApplication();
    app
      .getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (incoming) => {
        const id = incoming.headers["x-test-user-id"];
        if (typeof id === "string" && id)
          attachPlatformPrincipal(incoming as PlatformPrincipalCarrier, {
            userId: id
          });
      });
    await app.init();

    const org = await createTestOrganization(migration, owner, {
      slug: `paywall-${randomUUID().slice(0, 8)}`,
      name: "Paywall academy"
    });
    orgId = org.id;
    orgSlug = org.slug;

    const manifest = courseManifestV1Schema.parse(
      JSON.parse(readFileSync("docs/examples/git-track.manifest.json", "utf8"))
    );
    manifest.course.slug = `paywall-git-${randomUUID().slice(0, 8)}`;
    const plan = await ok(
      "POST",
      `organizations/${orgId}/courses/manifest/validate`,
      owner,
      manifest
    );
    const applied = await ok(
      "POST",
      `organizations/${orgId}/courses/manifest/apply`,
      owner,
      {
        manifest,
        expectedDraftVersionId: plan.expectedDraftVersionId,
        expectedRevision: plan.expectedRevision
      }
    );
    await ok(
      "POST",
      `organizations/${orgId}/courses/${String(applied.courseId)}/versions/${String(applied.draftVersionId)}/publish`,
      owner,
      {}
    );
    const offering = await ok(
      "POST",
      `organizations/${orgId}/offerings`,
      owner,
      {
        slug: offeringSlug,
        name: "Git",
        courseVersionId: applied.draftVersionId,
        deliveryMode: "self_paced",
        accessMode: "membership"
      },
      201
    );
    await ok(
      "PATCH",
      `organizations/${orgId}/offerings/${String(offering.id)}/visibility`,
      owner,
      { visibility: "public" }
    );
    await ok("PUT", `organizations/${orgId}/customer-entry-policy`, owner, {
      policy: "open"
    });
    await ok(
      "POST",
      `public/organizations/${orgSlug}/memberships/me`,
      learner,
      {}
    );
    await ok(
      "POST",
      `me/learning/${orgSlug}/${offeringSlug}/enrollment`,
      learner,
      {}
    );
  });

  afterAll(async () => {
    await app.close();
    await Promise.all([migration.end(), runtime.end()]);
    if (previousOrigin === undefined) delete process.env.WEB_APP_ORIGIN;
    else process.env.WEB_APP_ORIGIN = previousOrigin;
  });

  it("changes nothing while the organization sells no subscription", async () => {
    await ageAccount(30);
    expect((await check("add-what", "old")).statusCode).toBe(200);
  });

  it("answers 402 after the first chapter once a plan is on sale, and keeps the first chapter free", async () => {
    const plan = await ok(
      "POST",
      `organizations/${orgId}/subscription-plans`,
      owner,
      { slug: "full", name: "Полный доступ" },
      201
    );
    await ok(
      "POST",
      `organizations/${orgId}/subscription-plans/${String(plan.id)}/prices`,
      owner,
      { amountMinor: 99000, currency: "RUB", billingPeriod: "month" },
      201
    );

    const blocked = await check("add-what", "old");
    expect(blocked.statusCode).toBe(402);
    expect(blocked.json()).toMatchObject({ code: "subscription_required" });
    expect((await check("why-snap", "snap")).statusCode).toBe(200);

    const attempts = await migration.query<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM learning_progress.attempts AS attempt
         JOIN learning_content.course_version_activities AS activity
           ON activity.organization_id = attempt.organization_id
          AND activity.id = attempt.activity_version_id
        WHERE attempt.organization_id = $1 AND activity.slug = 'add-what'`,
      [orgId]
    );
    expect(attempts.rows[0]?.count).toBe(1);
  });

  it("lets the trial and a paid subscription through", async () => {
    await ageAccount(1);
    expect((await check("add-what", "old")).statusCode).toBe(200);

    await ageAccount(30);
    expect((await check("add-what", "old")).statusCode).toBe(402);

    const price = await migration.query<{ id: string }>(
      `SELECT id::text FROM commerce.subscription_plan_prices WHERE organization_id = $1`,
      [orgId]
    );
    const subscription = await migration.query<{ id: string }>(
      `INSERT INTO commerce.subscriptions
         (organization_id, user_id, plan_price_id, amount_minor, currency, billing_period, idempotency_key)
       VALUES ($1, $2, $3, 99000, 'RUB', 'month', $4) RETURNING id::text`,
      [orgId, learner, price.rows[0]!.id, `key-${randomUUID()}`]
    );
    await runtime.query(
      `SELECT commerce.apply_subscription_event($1, $2, 'payment_succeeded', 'pay-1', 99000, 'RUB', now())`,
      [orgId, subscription.rows[0]!.id]
    );
    expect((await check("add-what", "old")).statusCode).toBe(200);
  });
});
