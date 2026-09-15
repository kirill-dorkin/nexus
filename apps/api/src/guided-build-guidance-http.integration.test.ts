import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  guidedBuildLearnerViewSchema,
  submissionSchema
} from "@platform/contracts";
import {
  createDatabasePool,
  type DatabasePool
} from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for Guided Build integration tests.`);
  }
  return value;
}

type IdRow = { id: string };

describe("protected Guided Build guidance HTTP lifecycle", () => {
  let migrationPool: DatabasePool;
  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let clonedCourseVersionId = "";
  let skillId = "";
  let activityId = "";
  let activityVersionId = "";
  let transferActivityId = "";
  let transferActivityVersionId = "";
  let offeringId = "";
  let enrollmentId = "";
  let attemptId = "";
  const createdUserIds: string[] = [];

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`${label}-${randomUUID()}@example.test`, label]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) throw new Error("Failed to create Guided Build test identity.");
    createdUserIds.push(id);
    return id;
  }

  beforeAll(async () => {
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "guided-build-guidance-integration-fixtures"
    });

    ownerUserId = await createUser("guided-build-owner");
    learnerUserId = await createUser("guided-build-learner");

    app = await createApiApplication();
    app.getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (request) => {
        const testUserId = request.headers["x-test-user-id"];
        if (typeof testUserId === "string" && testUserId.length > 0) {
          attachPlatformPrincipal(request as PlatformPrincipalCarrier, {
            userId: testUserId
          });
        }
      });
    await app.init();

    const organization = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `guided-build-${randomUUID()}`,
        name: "Guided Build integration"
      }
    });
    if (organization.statusCode !== 201) {
      throw new Error(`Failed to create organization: ${organization.body}`);
    }
    organizationId = (JSON.parse(organization.body) as { id: string }).id;

    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    if (invite.statusCode !== 201) throw new Error(`Failed to invite learner: ${invite.body}`);

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": learnerUserId }
    });
    if (accept.statusCode !== 200) throw new Error(`Failed to activate learner: ${accept.body}`);

    const role = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/role-assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId: learnerUserId,
        roleKey: "learner",
        scope: { type: "organization", id: organizationId }
      }
    });
    if (role.statusCode !== 204) throw new Error(`Failed to assign learner role: ${role.body}`);

    const skill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `guided-build-${randomUUID()}`,
        title: "Guided Build skill"
      }
    });
    if (skill.statusCode !== 201) throw new Error(`Failed to create skill: ${skill.body}`);
    skillId = (JSON.parse(skill.body) as { id: string }).id;

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `guided-build-${randomUUID()}`,
        title: "Guided Build course"
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

    const transfer = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "guided-build-transfer",
        activityType: "foundation.structured-practice",
        title: "Transfer challenge",
        skillIds: [skillId]
      }
    });
    if (transfer.statusCode !== 201) throw new Error(`Failed to create transfer: ${transfer.body}`);
    const transferBody = JSON.parse(transfer.body) as { id: string; activityId: string };
    transferActivityVersionId = transferBody.id;
    transferActivityId = transferBody.activityId;

    const activity = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "guided-build-practice",
        activityType: "foundation.structured-practice",
        title: "Guided Build practice",
        skillIds: [skillId],
        config: { learnerVisible: "safe" },
        guidedBuild: {
          schemaVersion: 1,
          steps: [
            {
              key: "layout",
              title: "Build the layout",
              instructions: "Create the grid before asking for help.",
              hints: [
                { key: "grid-track", content: { text: "Start with grid-template-columns." } },
                { key: "grid-gap", content: { text: "Then add a gap between tracks." } }
              ]
            }
          ],
          professionalSolution: {
            key: "professional-solution",
            title: "Professional solution",
            content: { code: ".layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }" }
          },
          transferActivityVersionId
        }
      }
    });
    if (activity.statusCode !== 201) throw new Error(`Failed to create Guided Build activity: ${activity.body}`);
    const activityBody = JSON.parse(activity.body) as {
      id: string;
      activityId: string;
      config: Record<string, unknown>;
    };
    activityVersionId = activityBody.id;
    activityId = activityBody.activityId;
    expect(activityBody.config).toEqual({ learnerVisible: "safe" });
    expect(JSON.stringify(activityBody)).not.toContain("grid-template-columns");
    expect(JSON.stringify(activityBody)).not.toContain("Professional solution");

    const publish = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/publish`,
      headers: { "x-test-user-id": ownerUserId }
    });
    if (publish.statusCode !== 200) throw new Error(`Failed to publish course: ${publish.body}`);

    const clone = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { title: "Guided Build course v2" }
    });
    if (clone.statusCode !== 201) throw new Error(`Failed to clone course version: ${clone.body}`);
    clonedCourseVersionId = (JSON.parse(clone.body) as { id: string }).id;

    const offering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId,
        slug: `guided-build-${randomUUID()}`,
        name: "Guided Build offering",
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
    if (enrollment.statusCode !== 201) throw new Error(`Failed to enroll learner: ${enrollment.body}`);
    enrollmentId = (JSON.parse(enrollment.body) as { id: string }).id;

    const attempt = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {}
    });
    if (attempt.statusCode !== 201) throw new Error(`Failed to start Attempt: ${attempt.body}`);
    attemptId = (JSON.parse(attempt.body) as { id: string }).id;
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();

    if (organizationId.length > 0) {
      await migrationPool.query(`DELETE FROM learning_history.learning_events WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_guidance.guidance_exposures WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM events.outbox WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_progress.evidence WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_progress.submissions WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_progress.attempts WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_progress.mastery_projections WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_delivery.enrollments WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_delivery.learning_offerings WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.guided_build_hints WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.guided_build_steps WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.guided_build_definitions WHERE organization_id = $1`, [organizationId]);
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
    await migrationPool.end();
  });

  it("clones protected content by stable Activity identity and keeps published rows immutable", async () => {
    const clone = await migrationPool.query<{
      source_activity_id: string;
      cloned_activity_id: string;
      cloned_transfer_activity_id: string;
    }>(
      `SELECT source.activity_id::text AS source_activity_id,
              target.activity_id::text AS cloned_activity_id,
              target_transfer.activity_id::text AS cloned_transfer_activity_id
         FROM learning_content.guided_build_definitions AS definition
         JOIN learning_content.course_version_activities AS target
           ON target.id = definition.activity_version_id
         JOIN learning_content.course_version_activities AS source
           ON source.organization_id = target.organization_id
          AND source.course_version_id = $2
          AND source.activity_id = target.activity_id
         JOIN learning_content.course_version_activities AS target_transfer
           ON target_transfer.id = definition.transfer_activity_version_id
        WHERE definition.organization_id = $1
          AND target.course_version_id = $3`,
      [organizationId, courseVersionId, clonedCourseVersionId]
    );
    expect(clone.rows).toHaveLength(1);
    expect(clone.rows[0]).toMatchObject({
      source_activity_id: activityId,
      cloned_activity_id: activityId,
      cloned_transfer_activity_id: transferActivityId
    });

    await expect(
      migrationPool.query(
        `UPDATE learning_content.guided_build_hints
            SET content = '{"text":"leaked mutation"}'::jsonb
          WHERE organization_id = $1
            AND activity_version_id = $2
            AND hint_key = 'grid-track'`,
        [organizationId, activityVersionId]
      )
    ).rejects.toMatchObject({ code: "55000" });
  });

  it("keeps protected content hidden until an authorized learner disclosure", async () => {
    const initial = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/guided-build`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(initial.statusCode).toBe(200);
    const initialView = guidedBuildLearnerViewSchema.parse(JSON.parse(initial.body));
    expect(initialView.state).toMatchObject({ phase: "working", workAssistance: "unassisted" });
    expect(initialView.steps[0]?.revealedHints).toEqual([]);
    expect(initialView.professionalSolution).toBeNull();
    expect(initial.body).not.toContain("grid-template-columns");

    const ownerRead = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/guided-build`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(ownerRead.statusCode).toBe(403);

    const prematureSolution = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/guided-build/solution`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { idempotencyKey: "solution-before-submission" }
    });
    expect(prematureSolution.statusCode).toBe(409);
  });

  it("reveals hints in order and makes retries exactly idempotent", async () => {
    const first = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/guided-build/hints`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { stepKey: "layout", idempotencyKey: "layout-hint-1" }
    });
    expect(first.statusCode).toBe(200);
    const firstView = guidedBuildLearnerViewSchema.parse(JSON.parse(first.body));
    expect(firstView.steps[0]?.revealedHints).toHaveLength(1);
    expect(firstView.steps[0]?.revealedHints[0]).toMatchObject({
      key: "grid-track",
      content: { text: "Start with grid-template-columns." }
    });
    expect(firstView.state.workAssistance).toBe("hint_assisted");

    const retry = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/guided-build/hints`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { stepKey: "layout", idempotencyKey: "layout-hint-1" }
    });
    expect(retry.statusCode).toBe(200);
    expect(guidedBuildLearnerViewSchema.parse(JSON.parse(retry.body)).steps[0]?.revealedHints).toHaveLength(1);

    const second = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/guided-build/hints`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { stepKey: "layout", idempotencyKey: "layout-hint-2" }
    });
    expect(second.statusCode).toBe(200);
    const secondView = guidedBuildLearnerViewSchema.parse(JSON.parse(second.body));
    expect(secondView.steps[0]?.revealedHints.map((hint) => hint.key)).toEqual([
      "grid-track",
      "grid-gap"
    ]);

    const facts = await migrationPool.query<{ exposures: number; events: number }>(
      `SELECT
         (SELECT count(*)::integer FROM learning_guidance.guidance_exposures
           WHERE organization_id = $1 AND attempt_id = $2 AND kind = 'hint') AS exposures,
         (SELECT count(*)::integer FROM learning_history.learning_events
           WHERE organization_id = $1 AND attempt_id = $2 AND event_name = 'guidance.hint_revealed') AS events`,
      [organizationId, attemptId]
    );
    expect(facts.rows[0]).toEqual({ exposures: 2, events: 2 });
  });

  it("locks hints after Submission and reveals the solution without creating Evidence", async () => {
    const submitted = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/submissions`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { payload: { answer: "learner work" } }
    });
    expect(submitted.statusCode).toBe(201);
    submissionSchema.parse(JSON.parse(submitted.body));

    const lateHint = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/guided-build/hints`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { stepKey: "layout", idempotencyKey: "late-hint" }
    });
    expect(lateHint.statusCode).toBe(409);

    const solution = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/guided-build/solution`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { idempotencyKey: "solution-after-submission" }
    });
    expect(solution.statusCode).toBe(200);
    const solutionView = guidedBuildLearnerViewSchema.parse(JSON.parse(solution.body));
    expect(solutionView.state.phase).toBe("reviewing");
    expect(solutionView.professionalSolution).toMatchObject({
      key: "professional-solution",
      content: { code: ".layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }" }
    });

    const retry = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/guided-build/solution`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { idempotencyKey: "solution-after-submission" }
    });
    expect(retry.statusCode).toBe(200);

    const sideEffects = await migrationPool.query<{
      solution_exposures: number;
      solution_events: number;
      evidence: number;
      guidance_outbox: number;
    }>(
      `SELECT
         (SELECT count(*)::integer FROM learning_guidance.guidance_exposures
           WHERE organization_id = $1 AND attempt_id = $2 AND kind = 'professional_solution') AS solution_exposures,
         (SELECT count(*)::integer FROM learning_history.learning_events
           WHERE organization_id = $1 AND attempt_id = $2 AND event_name = 'guidance.solution_revealed') AS solution_events,
         (SELECT count(*)::integer FROM learning_progress.evidence
           WHERE organization_id = $1 AND attempt_id = $2) AS evidence,
         (SELECT count(*)::integer FROM events.outbox
           WHERE organization_id = $1 AND event_name LIKE 'guidance.%') AS guidance_outbox`,
      [organizationId, attemptId]
    );
    expect(sideEffects.rows[0]).toEqual({
      solution_exposures: 1,
      solution_events: 1,
      evidence: 0,
      guidance_outbox: 0
    });

    const history = await migrationPool.query<{
      event_name: string;
      guidance_step_key: string | null;
      guidance_hint_key: string | null;
      guidance_solution_key: string | null;
    }>(
      `SELECT event_name, guidance_step_key, guidance_hint_key, guidance_solution_key
         FROM learning_history.learning_events
        WHERE organization_id = $1
          AND attempt_id = $2
          AND event_name LIKE 'guidance.%'
        ORDER BY occurred_at, event_order, id`,
      [organizationId, attemptId]
    );
    expect(history.rows).toMatchObject([
      { event_name: "guidance.hint_revealed", guidance_step_key: "layout", guidance_hint_key: "grid-track", guidance_solution_key: null },
      { event_name: "guidance.hint_revealed", guidance_step_key: "layout", guidance_hint_key: "grid-gap", guidance_solution_key: null },
      { event_name: "guidance.solution_revealed", guidance_step_key: null, guidance_hint_key: null, guidance_solution_key: "professional-solution" }
    ]);
    expect(JSON.stringify(history.rows)).not.toContain("grid-template-columns");
  });
});
