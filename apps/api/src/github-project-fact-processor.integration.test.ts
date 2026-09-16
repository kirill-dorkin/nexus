import { createHash, randomUUID } from "node:crypto";

import { createDatabasePool, type DatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PostgresGitHubProjectFactDeliveryRepository } from "./modules/integrations/infrastructure/postgres-github-project-fact-delivery.repository";
import { GitHubProjectFactProcessor } from "./modules/projects/infrastructure/github-project-fact.processor";
import { PostgresGitHubProjectFactsRepository } from "./modules/projects/infrastructure/postgres-github-project-facts.repository";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for GitHub Project-fact integration tests.`);
  }
  return value;
}

function externalId(): number {
  return 30_000_000_000 + Math.floor(Math.random() * 8_000_000_000);
}

function sha(seed: string): string {
  return createHash("sha1").update(seed).digest("hex");
}

type IdRow = { id: string };
type Fixture = Readonly<{
  userId: string;
  organizationId: string;
  installationId: number;
  repositoryId: number;
  repositoryMappingId: string;
  projectId: string;
  bindingId: string | null;
}>;

describe("GitHub Project fact processor", () => {
  const organizationIds: string[] = [];
  const deliveryIds: string[] = [];
  let migrationPool: DatabasePool;
  let workerPool: DatabasePool;
  let processor: GitHubProjectFactProcessor;

  beforeAll(() => {
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"));
    workerPool = createDatabasePool(requireEnv("DATABASE_WORKER_URL"));
    processor = new GitHubProjectFactProcessor(
      workerPool,
      new PostgresGitHubProjectFactDeliveryRepository(),
      new PostgresGitHubProjectFactsRepository(),
      { leaseSeconds: 30, maxAttempts: 3, retryBaseMs: 1, retryMaxMs: 5 }
    );
  });

  afterAll(async () => {
    for (const organizationId of organizationIds) {
      await migrationPool.query(
        `DELETE FROM organizations.organizations WHERE id = $1`,
        [organizationId]
      );
    }
    if (deliveryIds.length > 0) {
      await migrationPool.query(
        `DELETE FROM integrations.github_webhook_inbox
         WHERE delivery_id = ANY($1::uuid[])`,
        [deliveryIds]
      );
    }
    await Promise.all([migrationPool?.end(), workerPool?.end()]);
  });

  async function createFixture(label: string, bind = true): Promise<Fixture> {
    const user = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`project-fact-${label}-${randomUUID()}@example.test`, `Project fact ${label}`]
    );
    const userId = user.rows[0]?.id;
    if (userId === undefined) throw new Error("Failed to create Project-fact test user.");

    const organization = await migrationPool.query<IdRow>(
      `INSERT INTO organizations.organizations (slug, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [`project-fact-${label}-${randomUUID()}`, `Project fact ${label}`, userId]
    );
    const organizationId = organization.rows[0]?.id;
    if (organizationId === undefined) throw new Error("Failed to create Project-fact organization.");
    organizationIds.push(organizationId);

    await migrationPool.query(
      `INSERT INTO organizations.memberships (organization_id, user_id, status, joined_at)
       VALUES ($1, $2, 'active', now())`,
      [organizationId, userId]
    );

    const installationId = externalId();
    const repositoryId = externalId();
    await migrationPool.query(
      `INSERT INTO integrations.github_installations (
         organization_id, github_installation_id, status
       ) VALUES ($1, $2, 'active')`,
      [organizationId, installationId]
    );
    const repository = await migrationPool.query<IdRow>(
      `INSERT INTO integrations.github_repositories (
         organization_id, github_installation_id, github_repository_id, full_name, status
       ) VALUES ($1, $2, $3, $4, 'active')
       RETURNING id::text`,
      [organizationId, installationId, repositoryId, `nexus-${label}/repository`]
    );
    const repositoryMappingId = repository.rows[0]?.id;
    if (repositoryMappingId === undefined) throw new Error("Failed to create repository mapping.");

    const team = await migrationPool.query<IdRow>(
      `INSERT INTO projects.teams (organization_id, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [organizationId, `Team ${label}`, userId]
    );
    const teamId = team.rows[0]?.id;
    if (teamId === undefined) throw new Error("Failed to create Project-fact team.");

    const project = await migrationPool.query<IdRow>(
      `INSERT INTO projects.projects (
         organization_id, team_id, name, created_by_user_id
       ) VALUES ($1, $2, $3, $4)
       RETURNING id::text`,
      [organizationId, teamId, `Project ${label}`, userId]
    );
    const projectId = project.rows[0]?.id;
    if (projectId === undefined) throw new Error("Failed to create Project-fact project.");

    let bindingId: string | null = null;
    if (bind) {
      const binding = await migrationPool.query<IdRow>(
        `INSERT INTO projects.repository_bindings (
           organization_id,
           project_id,
           github_repository_mapping_id,
           connected_by_user_id,
           connected_at
         ) VALUES ($1, $2, $3, $4, now() - interval '1 minute')
         RETURNING id::text`,
        [organizationId, projectId, repositoryMappingId, userId]
      );
      bindingId = binding.rows[0]?.id ?? null;
      if (bindingId === null) throw new Error("Failed to create repository binding.");
    }

    return {
      userId,
      organizationId,
      installationId,
      repositoryId,
      repositoryMappingId,
      projectId,
      bindingId
    };
  }

  async function insertDelivery(
    fixture: Fixture,
    input: Readonly<{
      eventName: "pull_request" | "pull_request_review" | "check_run" | "check_suite";
      action: string;
      payload: Readonly<Record<string, unknown>>;
      routingStatus?: "mapped" | "unmapped_repository";
      receivedAt?: Date;
    }>
  ): Promise<string> {
    const deliveryId = randomUUID();
    deliveryIds.push(deliveryId);
    const raw = JSON.stringify(input.payload);
    const row = await migrationPool.query<IdRow>(
      `INSERT INTO integrations.github_webhook_inbox (
         organization_id,
         delivery_id,
         event_name,
         action,
         github_installation_id,
         github_repository_id,
         routing_status,
         payload_sha256,
         payload,
         received_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, COALESCE($10, now()))
       RETURNING id::text`,
      [
        fixture.organizationId,
        deliveryId,
        input.eventName,
        input.action,
        fixture.installationId,
        fixture.repositoryId,
        input.routingStatus ?? "mapped",
        createHash("sha256").update(raw).digest("hex"),
        raw,
        input.receivedAt ?? null
      ]
    );
    const inboxId = row.rows[0]?.id;
    if (inboxId === undefined) throw new Error("Failed to insert GitHub Project-fact delivery.");
    return inboxId;
  }

  function basePayload(fixture: Fixture): Readonly<Record<string, unknown>> {
    return {
      installation: { id: fixture.installationId },
      repository: { id: fixture.repositoryId },
      sender: { id: externalId(), login: "octocat" }
    };
  }

  function pullRequestPayload(
    fixture: Fixture,
    input: Readonly<{
      id: number;
      number: number;
      state: "open" | "closed";
      updatedAt: string;
      merged?: boolean;
    }>
  ): Readonly<Record<string, unknown>> {
    return {
      ...basePayload(fixture),
      pull_request: {
        id: input.id,
        number: input.number,
        state: input.state,
        draft: false,
        merged: input.merged ?? false,
        created_at: "2026-09-16T00:00:00Z",
        updated_at: input.updatedAt,
        head: { sha: sha(`pr-head-${input.id}`) },
        user: { id: externalId(), login: "learner-author" }
      }
    };
  }

  async function processing(inboxId: string): Promise<{
    status: string;
    attempt_count: number;
    failure_count: number;
    last_error_code: string | null;
  }> {
    const result = await migrationPool.query<{
      status: string;
      attempt_count: number;
      failure_count: number;
      last_error_code: string | null;
    }>(
      `SELECT status, attempt_count, failure_count, last_error_code
       FROM integrations.github_webhook_project_fact_processing
       WHERE inbox_id = $1`,
      [inboxId]
    );
    const row = result.rows[0];
    if (row === undefined) throw new Error("Project-fact processing state not found.");
    return row;
  }

  it("normalizes PR, review, check-run, and check-suite deliveries into Project facts", async () => {
    const fixture = await createFixture("normalize");
    const pullRequestId = externalId();
    const reviewId = externalId();
    const checkRunId = externalId();
    const checkSuiteId = externalId();
    const commitSha = sha("review-commit");
    const checkSha = sha("check-head");

    const inboxIds = [
      await insertDelivery(fixture, {
        eventName: "pull_request",
        action: "opened",
        payload: pullRequestPayload(fixture, {
          id: pullRequestId,
          number: 42,
          state: "open",
          updatedAt: "2026-09-16T00:01:00Z"
        })
      }),
      await insertDelivery(fixture, {
        eventName: "pull_request_review",
        action: "submitted",
        payload: {
          ...basePayload(fixture),
          pull_request: { id: pullRequestId, number: 42 },
          review: {
            id: reviewId,
            state: "approved",
            commit_id: commitSha,
            submitted_at: "2026-09-16T00:02:00Z",
            user: { id: externalId(), login: "reviewer" }
          }
        }
      }),
      await insertDelivery(fixture, {
        eventName: "check_run",
        action: "completed",
        payload: {
          ...basePayload(fixture),
          check_run: {
            id: checkRunId,
            name: "CI / verify",
            status: "completed",
            conclusion: "success",
            head_sha: checkSha,
            started_at: "2026-09-16T00:02:00Z",
            completed_at: "2026-09-16T00:03:00Z",
            app: { id: externalId() }
          }
        }
      }),
      await insertDelivery(fixture, {
        eventName: "check_suite",
        action: "completed",
        payload: {
          ...basePayload(fixture),
          check_suite: {
            id: checkSuiteId,
            status: "completed",
            conclusion: "success",
            head_sha: checkSha,
            created_at: "2026-09-16T00:01:30Z",
            updated_at: "2026-09-16T00:03:00Z",
            app: { id: externalId() }
          }
        }
      })
    ];

    for (let index = 0; index < inboxIds.length; index += 1) {
      expect(await processor.processOne()).toBe(true);
    }

    for (const inboxId of inboxIds) {
      expect(await processing(inboxId)).toMatchObject({ status: "completed" });
    }

    const facts = await migrationPool.query<{
      fact_type: string;
      project_id: string;
      repository_binding_id: string;
      github_object_id: string;
      github_pull_request_number: number | null;
      state: string | null;
      status: string | null;
      conclusion: string | null;
      head_sha: string | null;
      commit_sha: string | null;
    }>(
      `SELECT
         fact_type,
         project_id::text,
         repository_binding_id::text,
         github_object_id::text,
         github_pull_request_number,
         state,
         status,
         conclusion,
         head_sha,
         commit_sha
       FROM projects.github_project_facts
       WHERE organization_id = $1
       ORDER BY source_received_at, id`,
      [fixture.organizationId]
    );

    expect(facts.rows).toHaveLength(4);
    expect(new Set(facts.rows.map((fact) => fact.fact_type))).toEqual(
      new Set(["pull_request", "pull_request_review", "check_run", "check_suite"])
    );
    expect(facts.rows.every((fact) => fact.project_id === fixture.projectId)).toBe(true);
    expect(facts.rows.every((fact) => fact.repository_binding_id === fixture.bindingId)).toBe(true);
    expect(facts.rows.find((fact) => fact.fact_type === "pull_request_review")).toMatchObject({
      github_pull_request_number: 42,
      state: "approved",
      commit_sha: commitSha
    });
    expect(facts.rows.find((fact) => fact.fact_type === "check_run")).toMatchObject({
      status: "completed",
      conclusion: "success",
      head_sha: checkSha
    });
  });

  it("preserves out-of-order snapshots as immutable facts instead of overwriting by arrival order", async () => {
    const fixture = await createFixture("stale");
    const pullRequestId = externalId();
    const newer = await insertDelivery(fixture, {
      eventName: "pull_request",
      action: "closed",
      payload: pullRequestPayload(fixture, {
        id: pullRequestId,
        number: 7,
        state: "closed",
        updatedAt: "2026-09-16T05:00:00Z",
        merged: true
      })
    });
    const stale = await insertDelivery(fixture, {
      eventName: "pull_request",
      action: "edited",
      payload: pullRequestPayload(fixture, {
        id: pullRequestId,
        number: 7,
        state: "open",
        updatedAt: "2026-09-16T04:00:00Z"
      })
    });

    expect(await processor.processOne()).toBe(true);
    expect(await processor.processOne()).toBe(true);
    expect((await processing(newer)).status).toBe("completed");
    expect((await processing(stale)).status).toBe("completed");

    const facts = await migrationPool.query<{
      action: string;
      state: string;
      is_merged: boolean;
      provider_updated_at: Date;
    }>(
      `SELECT action, state, is_merged, provider_updated_at
       FROM projects.github_project_facts
       WHERE organization_id = $1 AND github_object_id = $2
       ORDER BY source_received_at, id`,
      [fixture.organizationId, pullRequestId]
    );
    expect(facts.rows).toHaveLength(2);
    expect(facts.rows.map((fact) => fact.action)).toEqual(["closed", "edited"]);
    expect(facts.rows[0]).toMatchObject({ state: "closed", is_merged: true });
    expect(facts.rows[1]).toMatchObject({ state: "open", is_merged: false });
    expect(facts.rows[0]!.provider_updated_at.getTime()).toBeGreaterThan(
      facts.rows[1]!.provider_updated_at.getTime()
    );
  });

  it("does not retroactively attribute a delivery accepted before the repository was bound", async () => {
    const fixture = await createFixture("late-binding", false);
    const inboxId = await insertDelivery(fixture, {
      eventName: "pull_request",
      action: "opened",
      payload: pullRequestPayload(fixture, {
        id: externalId(),
        number: 9,
        state: "open",
        updatedAt: "2026-09-16T06:00:00Z"
      })
    });

    await migrationPool.query(
      `INSERT INTO projects.repository_bindings (
         organization_id,
         project_id,
         github_repository_mapping_id,
         connected_by_user_id,
         connected_at
       ) VALUES ($1, $2, $3, $4, now() + interval '1 second')`,
      [
        fixture.organizationId,
        fixture.projectId,
        fixture.repositoryMappingId,
        fixture.userId
      ]
    );

    expect(await processor.processOne()).toBe(true);
    expect(await processing(inboxId)).toMatchObject({
      status: "rejected",
      last_error_code: "repository_not_bound_at_receive_time"
    });
    const count = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM projects.github_project_facts
       WHERE source_inbox_id = $1`,
      [inboxId]
    );
    expect(count.rows[0]?.count).toBe("0");
  });

  it("rolls back a failed fact write, retries, and records exactly one fact", async () => {
    const fixture = await createFixture("retry");
    const inboxId = await insertDelivery(fixture, {
      eventName: "pull_request",
      action: "opened",
      payload: pullRequestPayload(fixture, {
        id: externalId(),
        number: 11,
        state: "open",
        updatedAt: "2026-09-16T07:00:00Z"
      })
    });
    const functionName = `fail_project_fact_${randomUUID().replaceAll("-", "_")}`;
    const triggerName = `fail_project_fact_${randomUUID().replaceAll("-", "_")}`;

    await migrationPool.query(
      `CREATE FUNCTION platform_internal.${functionName}()
       RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         IF NEW.source_inbox_id = '${inboxId}'::uuid THEN
           RAISE EXCEPTION 'simulated Project-fact failure';
         END IF;
         RETURN NEW;
       END
       $$`
    );
    await migrationPool.query(
      `CREATE TRIGGER ${triggerName}
       BEFORE INSERT ON projects.github_project_facts
       FOR EACH ROW EXECUTE FUNCTION platform_internal.${functionName}()`
    );

    expect(await processor.processOne()).toBe(true);
    expect(await processing(inboxId)).toMatchObject({
      status: "retryable",
      failure_count: 1
    });
    const beforeRetry = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM projects.github_project_facts WHERE source_inbox_id = $1`,
      [inboxId]
    );
    expect(beforeRetry.rows[0]?.count).toBe("0");

    await migrationPool.query(`DROP TRIGGER ${triggerName} ON projects.github_project_facts`);
    await migrationPool.query(`DROP FUNCTION platform_internal.${functionName}()`);
    await migrationPool.query(
      `UPDATE integrations.github_webhook_project_fact_processing
       SET available_at = now()
       WHERE inbox_id = $1`,
      [inboxId]
    );

    expect(await processor.processOne()).toBe(true);
    expect(await processing(inboxId)).toMatchObject({
      status: "completed",
      attempt_count: 2,
      failure_count: 1
    });
    const afterRetry = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM projects.github_project_facts WHERE source_inbox_id = $1`,
      [inboxId]
    );
    expect(afterRetry.rows[0]?.count).toBe("1");
  });

  it("rejects a payload whose repository identity differs from trusted routing", async () => {
    const fixture = await createFixture("identity");
    const payload = pullRequestPayload(fixture, {
      id: externalId(),
      number: 13,
      state: "open",
      updatedAt: "2026-09-16T08:00:00Z"
    });
    const inboxId = await insertDelivery(fixture, {
      eventName: "pull_request",
      action: "opened",
      payload: {
        ...payload,
        repository: { id: externalId() }
      }
    });

    expect(await processor.processOne()).toBe(true);
    expect(await processing(inboxId)).toMatchObject({
      status: "rejected",
      last_error_code: "routing_identity_mismatch"
    });
  });
});
