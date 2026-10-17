import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  attemptSchema,
  graderJobSchema,
  submissionSchema
} from "@platform/contracts";
import {
  createDatabasePool,
  withTenantTransaction,
  type DatabasePool
} from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestOrganization } from "./test-support/create-test-organization";
import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for grader-job integration tests.`);
  }
  return value;
}

type IdRow = { id: string };

type ClaimedJobRow = {
  job_id: string;
  organization_id: string;
  submission_id: string;
  activity_version_id: string;
  validator_key: string;
  validator_version: number;
  profile_key: string;
  profile_version: number;
  profile_fingerprint: string;
  request_payload: Record<string, unknown>;
  attempt_count: number;
  lease_token: string;
  lease_expires_at: Date;
};

const testProfile = {
  key: "typescript-tests",
  version: 1,
  language: { key: "typescript", version: "5.9" },
  runnerImageDigest: `sha256:${"b".repeat(64)}`,
  argv: ["node", "/runner/entry.mjs"],
  network: "off",
  filesystem: "ephemeral",
  readOnlyRootFilesystem: true,
  limits: {
    wallTimeMs: 10_000,
    cpuTimeMs: 8_000,
    memoryMiB: 256,
    pids: 32,
    outputBytes: 262_144,
    sourceBytes: 512_000,
    sourceFiles: 16
  }
} as const;

describe("durable grader job ledger", () => {
  let migrationPool: DatabasePool;
  let appPool: DatabasePool;
  let workerPool: DatabasePool;
  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let instructorUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let skillId = "";
  let executableActivityId = "";
  let unknownProfileActivityId = "";
  let offeringId = "";
  let enrollmentId = "";
  let validSubmissionId = "";
  let invalidSourceSubmissionId = "";
  let unknownProfileSubmissionId = "";
  const createdUserIds: string[] = [];
  const previousProfiles = process.env.GRADER_EXECUTION_PROFILES_JSON;

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`${label}-${randomUUID()}@example.test`, label]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) throw new Error("Failed to create grader-job test identity.");
    createdUserIds.push(id);
    return id;
  }

  async function activateMember(
    userId: string,
    roleKey: "learner" | "instructor"
  ): Promise<void> {
    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId }
    });
    if (invite.statusCode !== 201) throw new Error(`Failed to invite ${roleKey}: ${invite.body}`);

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": userId }
    });
    if (accept.statusCode !== 200) throw new Error(`Failed to activate ${roleKey}: ${accept.body}`);

    const role = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/role-assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId,
        roleKey,
        scope: { type: "organization", id: organizationId }
      }
    });
    if (role.statusCode !== 204) throw new Error(`Failed to assign ${roleKey}: ${role.body}`);
  }

  async function createAttemptAndSubmission(
    activityId: string,
    payload: Record<string, unknown>
  ): Promise<string> {
    const attemptResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {}
    });
    if (attemptResponse.statusCode !== 201) {
      throw new Error(`Failed to start grader attempt: ${attemptResponse.body}`);
    }
    const attempt = attemptSchema.parse(JSON.parse(attemptResponse.body));

    const submissionResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attempt.id}/submissions`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { payload }
    });
    if (submissionResponse.statusCode !== 201) {
      throw new Error(`Failed to create grader submission: ${submissionResponse.body}`);
    }
    return submissionSchema.parse(JSON.parse(submissionResponse.body)).id;
  }

  async function scheduleGraderJob(submissionId: string) {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/grader-jobs`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {}
    });
    if (response.statusCode !== 202) {
      throw new Error(`Failed to schedule grader job: ${response.body}`);
    }
    return graderJobSchema.parse(JSON.parse(response.body));
  }

  beforeAll(async () => {
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "grader-job-ledger-integration-fixtures"
    });
    appPool = createDatabasePool(requireEnv("DATABASE_URL"), {
      applicationName: "grader-job-ledger-integration-app"
    });
    workerPool = createDatabasePool(requireEnv("DATABASE_WORKER_URL"), {
      applicationName: "grader-job-ledger-integration-worker"
    });

    process.env.GRADER_EXECUTION_PROFILES_JSON = JSON.stringify([testProfile]);

    ownerUserId = await createUser("grader-job-owner");
    learnerUserId = await createUser("grader-job-learner");
    instructorUserId = await createUser("grader-job-instructor");

    app = await createApiApplication();
    app.getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (request) => {
        const testUserId = request.headers["x-test-user-id"];
        if (typeof testUserId === "string" && testUserId.length > 0) {
          attachPlatformPrincipal(request as PlatformPrincipalCarrier, { userId: testUserId });
        }
      });
    await app.init();

    organizationId = (await createTestOrganization(migrationPool, ownerUserId, {
        slug: `grader-job-${randomUUID()}`,
        name: "Grader job ledger integration"
      })).id;

    await activateMember(learnerUserId, "learner");
    await activateMember(instructorUserId, "instructor");

    const skill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `grader-job-${randomUUID()}`,
        title: "Grader job skill"
      }
    });
    if (skill.statusCode !== 201) throw new Error(`Failed to create skill: ${skill.body}`);
    skillId = (JSON.parse(skill.body) as { id: string }).id;

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `grader-job-${randomUUID()}`,
        title: "Grader job course"
      }
    });
    if (course.statusCode !== 201) throw new Error(`Failed to create course: ${course.body}`);
    const courseBody = JSON.parse(course.body) as {
      course: { id: string };
      draftVersion: { id: string };
    };
    courseId = courseBody.course.id;
    courseVersionId = courseBody.draftVersion.id;

    const attach = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { skillId }
    });
    if (attach.statusCode !== 201) throw new Error(`Failed to attach skill: ${attach.body}`);

    const executable = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "grader-job-typescript",
        activityType: "foundation.structured-practice",
        title: "Executable TypeScript practice",
        config: {
          validation: {
            validatorKey: "code-grader",
            validatorVersion: 1,
            config: { profile: { key: "typescript-tests", version: 1 } }
          }
        },
        skillIds: [skillId]
      }
    });
    if (executable.statusCode !== 201) {
      throw new Error(`Failed to create executable activity: ${executable.body}`);
    }
    executableActivityId = (JSON.parse(executable.body) as { activityId: string }).activityId;

    const unknownProfile = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "grader-job-unknown-profile",
        activityType: "foundation.structured-practice",
        title: "Unknown profile practice",
        config: {
          validation: {
            validatorKey: "code-grader",
            validatorVersion: 1,
            config: { profile: { key: "python-tests", version: 1 } }
          }
        },
        skillIds: [skillId]
      }
    });
    if (unknownProfile.statusCode !== 201) {
      throw new Error(`Failed to create unknown-profile activity: ${unknownProfile.body}`);
    }
    unknownProfileActivityId = (JSON.parse(unknownProfile.body) as { activityId: string }).activityId;

    const publish = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/publish`,
      headers: { "x-test-user-id": ownerUserId }
    });
    if (publish.statusCode !== 200) throw new Error(`Failed to publish course: ${publish.body}`);

    const offering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId,
        slug: `grader-job-${randomUUID()}`,
        name: "Grader job offering",
        deliveryMode: "self_paced"
      }
    });
    if (offering.statusCode !== 201) throw new Error(`Failed to create offering: ${offering.body}`);
    offeringId = (JSON.parse(offering.body) as { id: string }).id;

    const enrollment = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    if (enrollment.statusCode !== 201) throw new Error(`Failed to create enrollment: ${enrollment.body}`);
    enrollmentId = (JSON.parse(enrollment.body) as { id: string }).id;

    validSubmissionId = await createAttemptAndSubmission(executableActivityId, {
      source: {
        files: [{ path: "index.ts", content: "export const answer = 42;" }]
      }
    });
    invalidSourceSubmissionId = await createAttemptAndSubmission(executableActivityId, {
      answer: "no executable source envelope"
    });
    unknownProfileSubmissionId = await createAttemptAndSubmission(unknownProfileActivityId, {
      source: {
        files: [{ path: "main.py", content: "print(42)" }]
      }
    });
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();

    if (organizationId.length > 0) {
      await migrationPool.query(`DELETE FROM learning_progress.evidence WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_history.learning_events WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM events.outbox WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_validation.grader_job_processing WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_validation.validation_results WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_validation.grader_jobs WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_progress.submissions WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_progress.attempts WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_delivery.enrollments WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_delivery.learning_offerings WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.activity_skill_mappings WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.course_version_activities WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.course_version_skills WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.activities WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.skills WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.courses WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM organizations.organizations WHERE id = $1`, [organizationId]);
    }

    if (createdUserIds.length > 0) {
      await migrationPool.query(`DELETE FROM identity.users WHERE id = ANY($1::uuid[])`, [createdUserIds]);
    }

    if (previousProfiles === undefined) {
      delete process.env.GRADER_EXECUTION_PROFILES_JSON;
    } else {
      process.env.GRADER_EXECUTION_PROFILES_JSON = previousProfiles;
    }

    await workerPool.end();
    await appPool.end();
    await migrationPool.end();
  });

  it("schedules one content-addressed own-learner job idempotently", async () => {
    const schedule = async (userId: string) =>
      app.inject({
        method: "POST",
        url: `/v1/organizations/${organizationId}/submissions/${validSubmissionId}/grader-jobs`,
        headers: { "x-test-user-id": userId },
        payload: {}
      });

    const first = await schedule(learnerUserId);
    expect(first.statusCode).toBe(202);
    const job = graderJobSchema.parse(JSON.parse(first.body));
    expect(job).toMatchObject({
      organizationId,
      submissionId: validSubmissionId,
      validatorKey: "code-grader",
      validatorVersion: 1,
      profile: {
        key: "typescript-tests",
        version: 1
      },
      status: "pending",
      attemptCount: 0,
      lastErrorCode: null,
      finishedAt: null
    });
    expect(job.jobId).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(job.profile.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);

    const replay = await schedule(learnerUserId);
    expect(replay.statusCode).toBe(202);
    expect(graderJobSchema.parse(JSON.parse(replay.body)).jobId).toBe(job.jobId);

    const rows = await migrationPool.query<{
      count: number;
      source_content: string;
      requested_by_user_id: string;
    }>(
      `SELECT count(*)::integer AS count,
              min(job.request_payload #>> '{source,files,0,content}') AS source_content,
              min(job.requested_by_user_id::text) AS requested_by_user_id
         FROM learning_validation.grader_jobs AS job
        WHERE organization_id = $1
          AND submission_id = $2
        GROUP BY organization_id`,
      [organizationId, validSubmissionId]
    );
    expect(rows.rows[0]).toEqual({
      count: 1,
      source_content: "export const answer = 42;",
      requested_by_user_id: learnerUserId
    });

    const instructorDenied = await schedule(instructorUserId);
    expect(instructorDenied.statusCode).toBe(403);
  });

  it("rejects missing executable source and unavailable server-owned profiles", async () => {
    const invalidSource = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${invalidSourceSubmissionId}/grader-jobs`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {}
    });
    expect(invalidSource.statusCode).toBe(400);

    const unavailableProfile = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${unknownProfileSubmissionId}/grader-jobs`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {}
    });
    expect(unavailableProfile.statusCode).toBe(409);

    const jobs = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM learning_validation.grader_jobs
        WHERE organization_id = $1`,
      [organizationId]
    );
    expect(jobs.rows[0]?.count).toBe(1);
  });

  it("keeps app reads tenant-scoped while only worker functions mutate processing state", async () => {
    const foreignOrganizationId = randomUUID();
    const hidden = await withTenantTransaction(
      appPool,
      { organizationId: foreignOrganizationId, userId: learnerUserId },
      async (transaction) =>
        transaction.client.query<{ count: number }>(
          `SELECT count(*)::integer AS count FROM learning_validation.grader_jobs`
        )
    );
    expect(hidden.rows[0]?.count).toBe(0);

    await expect(
      workerPool.query(`UPDATE learning_validation.grader_job_processing SET status = 'retryable'`)
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("reclaims expired leases, rejects stale lease tokens, and dead-letters after bounded retries", async () => {
    const firstClaim = await workerPool.query<ClaimedJobRow>(
      `SELECT * FROM platform_internal.claim_grader_job(30)`
    );
    expect(firstClaim.rows).toHaveLength(1);
    expect(firstClaim.rows[0]).toMatchObject({
      organization_id: organizationId,
      submission_id: validSubmissionId,
      validator_key: "code-grader",
      validator_version: 1,
      profile_key: "typescript-tests",
      profile_version: 1,
      attempt_count: 1
    });
    const first = firstClaim.rows[0]!;

    await migrationPool.query(
      `UPDATE learning_validation.grader_job_processing
          SET lease_expires_at = now() - interval '1 second'
        WHERE job_id = $1`,
      [first.job_id]
    );

    const reclaimed = await workerPool.query<ClaimedJobRow>(
      `SELECT * FROM platform_internal.claim_grader_job(30)`
    );
    expect(reclaimed.rows).toHaveLength(1);
    const current = reclaimed.rows[0]!;
    expect(current.job_id).toBe(first.job_id);
    expect(current.attempt_count).toBe(2);
    expect(current.lease_token).not.toBe(first.lease_token);

    const staleFailure = await workerPool.query<{ status: string | null }>(
      `SELECT platform_internal.fail_grader_job($1, $2, $3, now()) AS status`,
      [first.job_id, first.lease_token, "stale_worker"]
    );
    expect(staleFailure.rows[0]?.status).toBeNull();

    let claim = current;
    for (let attempt = 2; attempt <= 5; attempt += 1) {
      const failure = await workerPool.query<{ status: string | null }>(
        `SELECT platform_internal.fail_grader_job($1, $2, $3, now()) AS status`,
        [claim.job_id, claim.lease_token, `attempt_${attempt}_failed`]
      );
      expect(failure.rows[0]?.status).toBe(attempt === 5 ? "dead_letter" : "retryable");

      if (attempt < 5) {
        const next = await workerPool.query<ClaimedJobRow>(
          `SELECT * FROM platform_internal.claim_grader_job(30)`
        );
        expect(next.rows).toHaveLength(1);
        claim = next.rows[0]!;
        expect(claim.attempt_count).toBe(attempt + 1);
      }
    }

    const processing = await migrationPool.query<{
      status: string;
      attempt_count: number;
      last_error_code: string | null;
      lease_token: string | null;
      validation_result_id: string | null;
      finished_at: Date | null;
    }>(
      `SELECT status,
              attempt_count,
              last_error_code,
              lease_token::text,
              validation_result_id::text,
              finished_at
         FROM learning_validation.grader_job_processing
        WHERE job_id = $1`,
      [first.job_id]
    );
    expect(processing.rows[0]).toMatchObject({
      status: "dead_letter",
      attempt_count: 5,
      last_error_code: "attempt_5_failed",
      lease_token: null
    });
    expect(processing.rows[0]?.finished_at).toBeInstanceOf(Date);
    const validationResultId = processing.rows[0]?.validation_result_id;
    expect(validationResultId).toBeTruthy();

    const result = await migrationPool.query<{
      id: string;
      status: string;
      outcome: string | null;
      score: string | null;
      evidence_trust: string;
      recorded_by_user_id: string | null;
      payload: Record<string, unknown>;
    }>(
      `SELECT id::text,
              status,
              outcome,
              score::text,
              evidence_trust,
              recorded_by_user_id::text,
              payload
         FROM learning_validation.validation_results
        WHERE grader_job_id = $1`,
      [first.job_id]
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: validationResultId,
      status: "system_error",
      outcome: null,
      score: null,
      evidence_trust: "trusted",
      recorded_by_user_id: null,
      payload: {
        graderJobId: first.job_id,
        protocolVersion: 1,
        terminalState: "dead_letter",
        error: { code: "attempt_5_failed", retryable: true }
      }
    });

    const outbox = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM events.outbox
        WHERE aggregate_type = 'validation_result'
          AND aggregate_id = $1::uuid
          AND event_name = 'validation.result_recorded'`,
      [validationResultId]
    );
    expect(outbox.rows[0]?.count).toBe(1);

    const learnerEvents = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM learning_history.learning_events
        WHERE validation_result_id = $1::uuid`,
      [validationResultId]
    );
    expect(learnerEvents.rows[0]?.count).toBe(0);

    const evidence = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM learning_progress.evidence
        WHERE source_validation_result_id = $1::uuid`,
      [validationResultId]
    );
    expect(evidence.rows[0]?.count).toBe(0);

    const noMoreWork = await workerPool.query<ClaimedJobRow>(
      `SELECT * FROM platform_internal.claim_grader_job(30)`
    );
    expect(noMoreWork.rows).toHaveLength(0);
  });

  it("records one completed system ValidationResult and replays an uncertain commit idempotently", async () => {
    const submissionId = await createAttemptAndSubmission(executableActivityId, {
      source: {
        files: [{ path: "index.ts", content: "export const replaySafe = 99;" }]
      }
    });
    const scheduled = await scheduleGraderJob(submissionId);

    const claimed = await workerPool.query<ClaimedJobRow>(
      `SELECT * FROM platform_internal.claim_grader_job(30)`
    );
    expect(claimed.rows).toHaveLength(1);
    const job = claimed.rows[0]!;
    expect(job.job_id).toBe(scheduled.jobId);

    const terminal = {
      protocolVersion: 1,
      jobId: job.job_id,
      status: "completed",
      outcome: "passed",
      score: 1,
      payload: { testsPassed: 4, testsTotal: 4 }
    };

    const firstAck = await workerPool.query<{ validation_result_id: string | null }>(
      `SELECT platform_internal.acknowledge_grader_job($1, $2, $3::jsonb)::text AS validation_result_id`,
      [job.job_id, job.lease_token, JSON.stringify(terminal)]
    );
    const validationResultId = firstAck.rows[0]?.validation_result_id;
    expect(validationResultId).toBeTruthy();

    // Simulates a Worker that received the Gateway response and committed it,
    // but crashed before learning whether the database acknowledgement succeeded.
    const replayAck = await workerPool.query<{ validation_result_id: string | null }>(
      `SELECT platform_internal.acknowledge_grader_job($1, $2, $3::jsonb)::text AS validation_result_id`,
      [job.job_id, job.lease_token, JSON.stringify(terminal)]
    );
    expect(replayAck.rows[0]?.validation_result_id).toBe(validationResultId);

    const persisted = await migrationPool.query<{
      count: number;
      status: string;
      outcome: string | null;
      score: string | null;
      evidence_trust: string;
      recorded_by_user_id: string | null;
    }>(
      `SELECT count(*)::integer AS count,
              min(status) AS status,
              min(outcome) AS outcome,
              min(score)::text AS score,
              min(evidence_trust) AS evidence_trust,
              min(recorded_by_user_id::text) AS recorded_by_user_id
         FROM learning_validation.validation_results
        WHERE grader_job_id = $1`,
      [job.job_id]
    );
    expect(persisted.rows[0]).toEqual({
      count: 1,
      status: "completed",
      outcome: "passed",
      score: "1.00000",
      evidence_trust: "trusted",
      recorded_by_user_id: null
    });

    const processing = await migrationPool.query<{
      status: string;
      validation_result_id: string | null;
      lease_token: string | null;
    }>(
      `SELECT status, validation_result_id::text, lease_token::text
         FROM learning_validation.grader_job_processing
        WHERE job_id = $1`,
      [job.job_id]
    );
    expect(processing.rows[0]).toEqual({
      status: "completed",
      validation_result_id: validationResultId,
      lease_token: null
    });

    const outbox = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM events.outbox
        WHERE aggregate_type = 'validation_result'
          AND aggregate_id = $1::uuid
          AND event_name = 'validation.result_recorded'`,
      [validationResultId]
    );
    expect(outbox.rows[0]?.count).toBe(1);

    const learnerEvents = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM learning_history.learning_events
        WHERE validation_result_id = $1::uuid
          AND event_name = 'validation.result_recorded'`,
      [validationResultId]
    );
    expect(learnerEvents.rows[0]?.count).toBe(1);

    const hidden = await withTenantTransaction(
      appPool,
      { organizationId: randomUUID(), userId: learnerUserId },
      async (transaction) =>
        transaction.client.query<{ count: number }>(
          `SELECT count(*)::integer AS count
             FROM learning_validation.validation_results
            WHERE grader_job_id = $1`,
          [job.job_id]
        )
    );
    expect(hidden.rows[0]?.count).toBe(0);
  });

  it("rejects stale and wrong-job terminal acknowledgements before recording needs-review state", async () => {
    const submissionId = await createAttemptAndSubmission(executableActivityId, {
      source: {
        files: [{ path: "index.ts", content: "export const reviewMe = true;" }]
      }
    });
    const scheduled = await scheduleGraderJob(submissionId);

    const firstClaim = await workerPool.query<ClaimedJobRow>(
      `SELECT * FROM platform_internal.claim_grader_job(30)`
    );
    expect(firstClaim.rows).toHaveLength(1);
    const stale = firstClaim.rows[0]!;
    expect(stale.job_id).toBe(scheduled.jobId);

    await migrationPool.query(
      `UPDATE learning_validation.grader_job_processing
          SET lease_expires_at = now() - interval '1 second'
        WHERE job_id = $1`,
      [stale.job_id]
    );

    const reclaimed = await workerPool.query<ClaimedJobRow>(
      `SELECT * FROM platform_internal.claim_grader_job(30)`
    );
    expect(reclaimed.rows).toHaveLength(1);
    const current = reclaimed.rows[0]!;
    expect(current.job_id).toBe(stale.job_id);
    expect(current.lease_token).not.toBe(stale.lease_token);

    const terminal = {
      protocolVersion: 1,
      jobId: current.job_id,
      status: "completed",
      outcome: "needs_review",
      score: null,
      payload: { reason: "ambiguous_output" }
    };

    const staleAck = await workerPool.query<{ validation_result_id: string | null }>(
      `SELECT platform_internal.acknowledge_grader_job($1, $2, $3::jsonb)::text AS validation_result_id`,
      [stale.job_id, stale.lease_token, JSON.stringify(terminal)]
    );
    expect(staleAck.rows[0]?.validation_result_id).toBeNull();

    await expect(
      workerPool.query(
        `SELECT platform_internal.acknowledge_grader_job($1, $2, $3::jsonb)`,
        [
          current.job_id,
          current.lease_token,
          JSON.stringify({ ...terminal, jobId: `sha256:${"f".repeat(64)}` })
        ]
      )
    ).rejects.toMatchObject({ code: "22023" });

    const beforeValidAck = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM learning_validation.validation_results
        WHERE grader_job_id = $1`,
      [current.job_id]
    );
    expect(beforeValidAck.rows[0]?.count).toBe(0);

    const validAck = await workerPool.query<{ validation_result_id: string | null }>(
      `SELECT platform_internal.acknowledge_grader_job($1, $2, $3::jsonb)::text AS validation_result_id`,
      [current.job_id, current.lease_token, JSON.stringify(terminal)]
    );
    const validationResultId = validAck.rows[0]?.validation_result_id;
    expect(validationResultId).toBeTruthy();

    const result = await migrationPool.query<{
      status: string;
      outcome: string | null;
      score: string | null;
      recorded_by_user_id: string | null;
    }>(
      `SELECT status, outcome, score::text, recorded_by_user_id::text
         FROM learning_validation.validation_results
        WHERE id = $1::uuid`,
      [validationResultId]
    );
    expect(result.rows[0]).toEqual({
      status: "completed",
      outcome: "needs_review",
      score: null,
      recorded_by_user_id: null
    });

    const evidence = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM learning_progress.evidence
        WHERE source_validation_result_id = $1::uuid`,
      [validationResultId]
    );
    expect(evidence.rows[0]?.count).toBe(0);
  });
});
