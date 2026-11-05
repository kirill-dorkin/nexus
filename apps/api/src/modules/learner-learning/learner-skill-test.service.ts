import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  branchTestThreshold,
  ownSkillTestsSchema,
  SKILL_TEST,
  skillTestDrawSchema,
  skillTestResultSchema,
  type CourseVersionActivity,
  type OwnSkillTests,
  type SkillTestAnswer,
  type SkillTestDraw,
  type SkillTestQuestion,
  type SkillTestResult,
  type SkillTestScope
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../database/database.service";
import { RequestContextService } from "../../request-context/request-context.service";
import { IdentityApplicationService } from "../identity/application/identity.service";
import { CheckoutOrganizationQuery } from "../organizations/application/checkout-organization.query";
import { PublicOrganizationQuery } from "../organizations/application/public-organization.query";
import { LearningContentQuery } from "../learning-content/application/learning-content.query";
import { SkillTestContentQuery } from "../learning-content/application/skill-test-content.query";
import { LearningDeliveryQuery } from "../learning-delivery/application/learning-delivery.query";
import { QuizSubmissionCommand } from "../learning-progress/application/quiz-submission.command";
import {
  SkillTestDrawsPort,
  type SkillTestDraw as StoredDraw
} from "../learning-progress/application/skill-test-draws.port";
import {
  SkillTestValidationApplicationService,
  type RecordedSkillTest,
  type SkillTestPart
} from "../learning-validation/application/skill-test-validation.service";
import { SKILL_BRANCHES } from "./domain/skill-branches.generated";
import { branchPartKey, pickQuestions } from "./domain/skill-test-draw.policy";

const RETRYABLE = ["23505", "40001", "40P01"];
const COOLDOWN_MS = SKILL_TEST.cooldownMinutes * 60_000;
const snapshot = { readOnly: true, isolationLevel: "repeatable_read" as const };

/** One tested skill of a skill or branch test, on the caller's own active Enrollment. */
export type SkillTestTarget = Readonly<{
  skillKey: string;
  enrollmentId: string;
  activity: CourseVersionActivity;
}>;

export type SkillTestTargets = Readonly<{
  organizationId: string;
  /** Every own active Enrollment in the organization: history spans them. */
  enrollmentIds: readonly string[];
  targets: readonly SkillTestTarget[];
}>;

type Part = SkillTestTarget & { drawId: string };

/**
 * ADR-0075: the skill test. A learner draws questions from a protected bank, answers
 * them all at once and, at 4 of 5, confirms the skill with Evidence.
 */
@Injectable()
export class LearnerSkillTestService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly organizations: PublicOrganizationQuery,
    private readonly memberships: CheckoutOrganizationQuery,
    private readonly delivery: LearningDeliveryQuery,
    private readonly content: LearningContentQuery,
    private readonly tests: SkillTestContentQuery,
    private readonly draws: SkillTestDrawsPort,
    private readonly submissions: QuizSubmissionCommand,
    private readonly validation: SkillTestValidationApplicationService
  ) {}

  /** Skills the caller can test now: an own active Enrollment's course has the bank. */
  async listOwn(organizationSlug: string): Promise<OwnSkillTests> {
    const { userId } = this.requestContext.requirePrincipal();
    return this.database.userTransaction(
      { userId },
      async (tx) => {
        await this.identity.requireActiveUser(tx, userId);
        const scope = await this.ownScope(tx, organizationSlug);
        if (!scope) return ownSkillTestsSchema.parse({ skillKeys: [] });
        const tests = await this.tests.publishedTests(
          tx,
          scope.organizationId,
          [...scope.courseVersions.keys()]
        );
        return ownSkillTestsSchema.parse({
          skillKeys: [...new Set(tests.map((t) => t.skillKey))].sort()
        });
      },
      snapshot
    );
  }

  /**
   * Every rule a learner must meet to start a test of these skills: active account and
   * membership, an own active Enrollment whose published course has each skill's bank, and
   * no failed attempt in the last 10 minutes. The prerequisite lock (ADR-0077) belongs here.
   */
  async validateStart(
    tx: DatabaseTransaction,
    userId: string,
    organizationSlug: string,
    skillKeys: readonly string[]
  ): Promise<SkillTestTargets> {
    const resolved = await this.requireTargets(
      tx,
      userId,
      organizationSlug,
      skillKeys
    );
    await this.requireNoCooldown(tx, resolved);
    return resolved;
  }

  async start(
    organizationSlug: string,
    scope: SkillTestScope,
    drawKey: string
  ): Promise<SkillTestDraw> {
    const { userId } = this.requestContext.requirePrincipal();
    const skillKeys = this.skillKeysOf(scope);
    return this.retrying(() =>
      this.database.userTransaction({ userId }, async (tx) => {
        await this.lockDrawKey(tx, drawKey);
        // A repeated start with the same key returns the same draw, even in a cooldown.
        let resolved = await this.requireTargets(
          tx,
          userId,
          organizationSlug,
          skillKeys
        );
        const parts = this.partsOf(scope, drawKey, resolved);
        let stored = await this.storedDraws(tx, resolved.organizationId, parts);
        if (!stored) {
          resolved = await this.validateStart(
            tx,
            userId,
            organizationSlug,
            skillKeys
          );
          stored = await this.drawParts(tx, resolved, parts, scope);
        }
        const banks = await this.validation.banksOf(
          tx,
          resolved.organizationId,
          this.validationParts(parts, stored)
        );
        return skillTestDrawSchema.parse({
          drawKey,
          scope,
          threshold: this.threshold(scope, stored),
          questions: parts.flatMap((part, index) => {
            const bank = this.bankByKey(banks.get(part.activity.id));
            return (stored[index]?.questionKeys ?? []).map((key) =>
              presentation(part.skillKey, bank.get(key))
            );
          })
        });
      })
    );
  }

  async submit(
    organizationSlug: string,
    scope: SkillTestScope,
    drawKey: string,
    answers: readonly SkillTestAnswer[]
  ): Promise<SkillTestResult> {
    const { userId } = this.requestContext.requirePrincipal();
    const skillKeys = this.skillKeysOf(scope);
    const canonical = [...answers]
      .map((answer) =>
        "optionIds" in answer
          ? { ...answer, optionIds: [...answer.optionIds].sort() }
          : answer
      )
      .sort((a, b) =>
        a.skillKey === b.skillKey
          ? a.key.localeCompare(b.key)
          : a.skillKey.localeCompare(b.skillKey)
      );
    const graded = await this.retrying(() =>
      this.database.userTransaction({ userId }, async (tx) => {
        await this.lockDrawKey(tx, drawKey);
        const resolved = await this.requireTargets(
          tx,
          userId,
          organizationSlug,
          skillKeys
        );
        const parts = this.partsOf(scope, drawKey, resolved);
        const stored = await this.storedDraws(
          tx,
          resolved.organizationId,
          parts
        );
        if (!stored) throw new NotFoundException("Skill test draw not found.");
        // A replay of a graded draw returns its result; a new submission waits out a failure.
        if (stored.some((draw) => draw.attemptId === null))
          await this.requireNoCooldown(tx, resolved);
        const validationParts = this.validationParts(parts, stored);
        const threshold = this.threshold(scope, stored);
        // Refuses foreign or missing answers before anything is stored.
        await this.validation.evaluate(
          tx,
          resolved.organizationId,
          validationParts,
          canonical,
          threshold
        );
        const recorded: RecordedSkillTest[] = [];
        for (const part of parts) {
          const submission = await this.submissions.commitOwn(
            tx,
            resolved.organizationId,
            part.enrollmentId,
            part.activity,
            part.drawId,
            jsonbOrdered({ drawKey, scope, answers: canonical })
          );
          if (
            !(await this.draws.linkAttempt(
              tx,
              resolved.organizationId,
              part.drawId,
              submission.attemptId
            ))
          )
            throw new ConflictException(
              "This draw is already linked to another attempt."
            );
          recorded.push(
            await this.validation.recordOwn(
              tx,
              resolved.organizationId,
              part.enrollmentId,
              part.activity.id,
              submission.id,
              validationParts,
              threshold
            )
          );
        }
        const banks = await this.validation.banksOf(
          tx,
          resolved.organizationId,
          validationParts
        );
        return { recorded, banks, parts };
      })
    );
    // The cooldown runs from the Evidence, so the result names the same moment.
    let gradedAt = 0;
    for (const recorded of graded.recorded)
      for (const evidence of await this.validation.normalize(recorded))
        gradedAt = Math.max(gradedAt, Date.parse(evidence.createdAt));
    const first = graded.recorded[0];
    if (!first) throw new Error("A skill test has at least one part.");
    const evaluation = first.evaluation;
    const answerOf = new Map(
      canonical.map((a) => [`${a.skillKey}\u0000${a.key}`, a] as const)
    );
    const bankOf = new Map(
      graded.parts.map(
        (part) =>
          [
            part.skillKey,
            this.bankByKey(graded.banks.get(part.activity.id))
          ] as const
      )
    );
    return skillTestResultSchema.parse({
      drawKey,
      scope,
      outcome: evaluation.outcome,
      correctCount: evaluation.correctCount,
      total: evaluation.total,
      threshold: evaluation.threshold,
      retryAfter:
        evaluation.outcome === "failed"
          ? new Date(
              (gradedAt || Date.parse(first.result.recordedAt)) + COOLDOWN_MS
            ).toISOString()
          : null,
      questions: evaluation.questions.map((graded) => {
        const question = bankOf.get(graded.skillKey)?.get(graded.key);
        if (!question) throw new Error("A graded question left the bank.");
        const answer = answerOf.get(`${graded.skillKey}\u0000${graded.key}`);
        const chosen =
          answer && "optionIds" in answer ? new Set(answer.optionIds) : null;
        return {
          skillKey: graded.skillKey,
          key: graded.key,
          correct: graded.correct,
          explanation: question.explanation,
          chosen: (question.options ?? [])
            .filter((option) => chosen?.has(option.id))
            .map((option) => ({
              id: option.id,
              explanation: option.explanation
            }))
        };
      })
    });
  }

  private skillKeysOf(scope: SkillTestScope): readonly string[] {
    if (scope.type === "skill") return [scope.skillKey];
    const skills = Object.hasOwn(SKILL_BRANCHES, scope.branchId)
      ? SKILL_BRANCHES[scope.branchId]
      : undefined;
    if (!skills?.length) throw new NotFoundException("Branch not found.");
    return skills;
  }

  /** The caller's organization and own active Enrollments by course version, or null. */
  private async ownScope(tx: DatabaseTransaction, organizationSlug: string) {
    const { userId } = this.requestContext.requirePrincipal();
    if (!(await this.organizations.findActiveBySlug(tx, organizationSlug)))
      throw new NotFoundException("Organization not found.");
    const organization = await this.memberships.resolveActiveMemberBySlug(
      tx,
      organizationSlug
    );
    if (!organization) return null;
    await tx.client.query("SELECT set_config('app.organization_id',$1,true)", [
      organization.id
    ]);
    const enrollments = (
      await this.delivery.listEnrollmentsForUsers(tx, organization.id, [userId])
    ).filter((e) => e.userId === userId && e.status === "active");
    const courseVersions = new Map<string, string>();
    for (const enrollment of enrollments) {
      const active = await this.delivery.requireActiveEnrollment(
        tx,
        organization.id,
        enrollment.id
      );
      if (!courseVersions.has(active.offering.courseVersionId))
        courseVersions.set(active.offering.courseVersionId, enrollment.id);
    }
    return {
      organizationId: organization.id,
      enrollmentIds: enrollments.map((e) => e.id),
      courseVersions
    };
  }

  private async requireTargets(
    tx: DatabaseTransaction,
    userId: string,
    organizationSlug: string,
    skillKeys: readonly string[]
  ): Promise<SkillTestTargets> {
    await this.identity.requireActiveUser(tx, userId, true);
    const scope = await this.ownScope(tx, organizationSlug);
    if (!scope) throw new NotFoundException("Skill test not found.");
    const tests = await this.tests.publishedTests(
      tx,
      scope.organizationId,
      [...scope.courseVersions.keys()],
      skillKeys
    );
    const targets: SkillTestTarget[] = [];
    for (const skillKey of skillKeys) {
      const test = tests.find((t) => t.skillKey === skillKey);
      const enrollmentId =
        test && scope.courseVersions.get(test.courseVersionId);
      if (!test || !enrollmentId)
        throw new NotFoundException("Skill test not found.");
      targets.push({
        skillKey,
        enrollmentId,
        activity: await this.content.requireActivityVersionById(
          tx,
          scope.organizationId,
          test.activityVersionId
        )
      });
    }
    return {
      organizationId: scope.organizationId,
      enrollmentIds: scope.enrollmentIds,
      targets
    };
  }

  /** `409 retake_cooldown` while any tested skill failed within the last 10 minutes. */
  private async requireNoCooldown(
    tx: DatabaseTransaction,
    resolved: SkillTestTargets
  ) {
    let retryAfter = 0;
    for (const target of resolved.targets) {
      const latest = await this.draws.latestOutcome(
        tx,
        resolved.organizationId,
        resolved.enrollmentIds,
        [target.activity.id]
      );
      if (latest?.outcome === "failed")
        retryAfter = Math.max(
          retryAfter,
          Date.parse(latest.recordedAt) + COOLDOWN_MS
        );
    }
    if (retryAfter > Date.now())
      throw new ConflictException({
        code: "retake_cooldown",
        message: `A failed test can be retaken ${SKILL_TEST.cooldownMinutes} minutes later.`,
        retryAfter: new Date(retryAfter).toISOString()
      });
  }

  private partsOf(
    scope: SkillTestScope,
    drawKey: string,
    resolved: SkillTestTargets
  ): Part[] {
    return resolved.targets.map((target) => ({
      ...target,
      drawId:
        scope.type === "skill"
          ? drawKey
          : branchPartKey(drawKey, target.skillKey)
    }));
  }

  /** The stored draws of every part, null when none exist; a foreign key is refused. */
  private async storedDraws(
    tx: DatabaseTransaction,
    organizationId: string,
    parts: readonly Part[]
  ): Promise<StoredDraw[] | null> {
    const found: (StoredDraw | null)[] = [];
    for (const part of parts)
      found.push(await this.draws.find(tx, organizationId, part.drawId));
    if (found.every((draw) => draw === null)) return null;
    const matches = found.every(
      (draw, index) =>
        draw !== null &&
        draw.enrollmentId === parts[index]?.enrollmentId &&
        draw.activityVersionId === parts[index]?.activity.id
    );
    if (!matches)
      throw new ConflictException("This draw key belongs to another test.");
    return found as StoredDraw[];
  }

  private async drawParts(
    tx: DatabaseTransaction,
    resolved: SkillTestTargets,
    parts: readonly Part[],
    scope: SkillTestScope
  ): Promise<StoredDraw[]> {
    const created: StoredDraw[] = [];
    for (const part of parts) {
      const bank = await this.tests.requireBank(
        tx,
        resolved.organizationId,
        part.activity.id
      );
      const seen = await this.draws.timesSeen(
        tx,
        resolved.organizationId,
        resolved.enrollmentIds,
        part.activity.id
      );
      created.push(
        await this.draws.create(tx, {
          id: part.drawId,
          organizationId: resolved.organizationId,
          enrollmentId: part.enrollmentId,
          activityVersionId: part.activity.id,
          questionKeys: pickQuestions(
            bank.map((q) => q.key),
            seen,
            scope.type === "skill" ? SKILL_TEST.size : 1
          )
        })
      );
    }
    return created;
  }

  private validationParts(
    parts: readonly Part[],
    stored: readonly StoredDraw[]
  ): SkillTestPart[] {
    return parts.map((part, index) => ({
      skillKey: part.skillKey,
      activityVersionId: part.activity.id,
      questionKeys: stored[index]?.questionKeys ?? []
    }));
  }

  private threshold(scope: SkillTestScope, stored: readonly StoredDraw[]) {
    const total = stored.reduce((sum, d) => sum + d.questionKeys.length, 0);
    return scope.type === "skill"
      ? Math.min(SKILL_TEST.threshold, total)
      : branchTestThreshold(total);
  }

  private bankByKey(bank: readonly SkillTestQuestion[] | undefined) {
    return new Map((bank ?? []).map((q) => [q.key, q] as const));
  }

  private async lockDrawKey(tx: DatabaseTransaction, drawKey: string) {
    await tx.client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
      ["skill-test-draw:" + drawKey]
    );
  }

  private async retrying<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        RETRYABLE.includes(String(error.code))
      )
        throw new ConflictException(
          "Skill test state changed. Retry the same action."
        );
      throw error;
    }
  }
}

/**
 * Object keys in jsonb order (length, then bytes), so a replayed Submission compares equal
 * to the stored one at every depth.
 */
function jsonbOrdered<T>(value: T): T {
  if (Array.isArray(value)) return value.map(jsonbOrdered) as T;
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) =>
        a.length === b.length
          ? a < b
            ? -1
            : a > b
              ? 1
              : 0
          : a.length - b.length
      )
      .map(([k, v]) => [k, jsonbOrdered(v)])
  ) as T;
}

/** A learner's view of a question: no answers, no explanations. */
function presentation(
  skillKey: string,
  question: SkillTestQuestion | undefined
) {
  if (!question) throw new Error("A drawn question left the bank.");
  return {
    skillKey,
    key: question.key,
    kind: question.kind,
    prompt: question.prompt,
    ...(question.code ? { code: question.code } : {}),
    ...(question.options
      ? { options: question.options.map(({ id, text }) => ({ id, text })) }
      : {})
  };
}
