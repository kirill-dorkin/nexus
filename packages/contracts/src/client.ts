// Browser versions of the response schemas Web parses on the client, built with
// `zod/mini` so pages ship only the validators they use (spec WP-6). Each one
// must accept and reject exactly what its full schema does:
// client.test.ts compares them on shared fixtures. Servers keep the full schemas.
import * as z from "zod/mini";

const uuid = z.uuid();
const slug = z
  .string()
  .check(
    z.minLength(2),
    z.maxLength(63),
    z.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  );
const trimmedTitle = z
  .string()
  .check(z.trim(), z.minLength(1), z.maxLength(200));
const int = (min: number, max = Number.MAX_SAFE_INTEGER) =>
  z.int().check(z.gte(min), z.lte(max));

export const clientIdentityUserSchema = z.object({
  id: uuid,
  email: z.email().check(z.maxLength(320)),
  displayName: z.nullable(z.string()),
  status: z.enum(["active", "suspended", "deleted"])
});

export const clientOAuthProvidersResponseSchema = z.object({
  providers: z.array(z.enum(["google", "github"]))
});

export const clientQuizCheckResultSchema = z.strictObject({
  attemptNumber: int(1),
  outcome: z.enum(["passed", "failed"]),
  score: z.union([z.literal(0), z.literal(1)]),
  feedback: z.string().check(z.minLength(1), z.maxLength(500))
});

export const clientAssignmentCheckResultSchema = z.strictObject({
  attemptNumber: int(1),
  outcome: z.enum(["passed", "failed"]),
  score: z.number().check(z.gte(0), z.lte(1)),
  checks: z
    .array(
      z.strictObject({
        label: z.string().check(z.minLength(1), z.maxLength(200)),
        passed: z.boolean(),
        hint: z.optional(z.string().check(z.maxLength(600)))
      })
    )
    .check(z.maxLength(100))
});

const presentation = {
  skillId: uuid,
  title: trimmedTitle,
  description: z.nullable(z.string().check(z.maxLength(5000))),
  position: int(0)
};
const skillProgress = z
  .discriminatedUnion("state", [
    z.object({
      ...presentation,
      state: z.literal("unobserved"),
      masteryScore: z.null(),
      evidenceCount: z.literal(0),
      scoredEvidenceCount: z.literal(0),
      lastEvidenceAt: z.null()
    }),
    z.object({
      ...presentation,
      state: z.literal("observed_unscored"),
      masteryScore: z.null(),
      evidenceCount: int(1),
      scoredEvidenceCount: z.literal(0),
      lastEvidenceAt: z.iso.datetime()
    }),
    z.object({
      ...presentation,
      state: z.literal("assessed"),
      masteryScore: z.number().check(z.gte(0), z.lte(1)),
      evidenceCount: int(1),
      scoredEvidenceCount: int(1),
      lastEvidenceAt: z.iso.datetime()
    })
  ])
  .check(
    z.refine(
      (value) =>
        value.state !== "assessed" ||
        value.scoredEvidenceCount <= value.evidenceCount,
      {
        message: "scoredEvidenceCount cannot exceed evidenceCount",
        path: ["scoredEvidenceCount"]
      }
    )
  );

export const clientLearnerCourseSkillsSchema = z.strictObject({
  skills: z.array(skillProgress).check(z.maxLength(500))
});

const counts = { passedRequired: int(0), totalRequired: int(0) };
const courseProgress = z.strictObject({
  policyKey: z.literal("required-activity-passes"),
  policyVersion: z.literal(2),
  ...counts,
  percentage: z.nullable(int(0, 100)),
  allRequiredPassed: z.boolean(),
  nextLessonSlug: z.nullable(slug),
  lastActionAt: z.nullable(z.iso.datetime()),
  lessons: z
    .array(
      z.strictObject({
        slug,
        ...counts,
        requiredPassed: z.boolean(),
        activities: z
          .array(z.strictObject({ slug, passed: z.boolean() }))
          .check(z.maxLength(200))
      })
    )
    .check(z.maxLength(200))
});

export const clientLearnerLearningCourseSchema = z.strictObject({
  organization: z.strictObject({
    slug,
    name: z.string().check(z.minLength(1), z.maxLength(160))
  }),
  offering: z.strictObject({
    slug,
    name: z.string().check(z.minLength(1), z.maxLength(160))
  }),
  course: z.strictObject({
    slug,
    title: trimmedTitle,
    description: z.string().check(z.maxLength(5000)),
    lessons: z
      .array(
        z.strictObject({
          slug,
          title: trimmedTitle,
          summary: z.string().check(z.maxLength(5000)),
          chapter: z.optional(
            z.string().check(z.minLength(1), z.maxLength(80))
          ),
          durationMinutes: int(1, 1440)
        })
      )
      .check(z.minLength(1), z.maxLength(200))
  }),
  entry: z.strictObject({
    customerEntryPolicy: z.enum(["open", "closed"]),
    membershipStatus: z.enum([
      "none",
      "active",
      "invited",
      "suspended",
      "left"
    ]),
    enrollmentStatus: z.nullable(
      z.enum(["active", "completed", "withdrawn", "cancelled"])
    )
  }),
  progress: z.nullable(courseProgress)
});

export const clientOwnLearningListSchema = z.strictObject({
  courses: z.array(clientLearnerLearningCourseSchema).check(z.maxLength(100)),
  nextCursor: z.nullable(uuid)
});

const nullableAt = z.nullable(z.iso.datetime());
const ownSkill = z
  .strictObject({
    skillKey: slug,
    masteryScore: z.nullable(z.number().check(z.gte(0), z.lte(1))),
    evidenceCount: int(1),
    scoredEvidenceCount: int(0),
    lastEvidenceAt: z.iso.datetime(),
    confirmations: int(0),
    firstConfirmedAt: nullableAt,
    lastConfirmedAt: nullableAt,
    confirmedDays: z.array(z.iso.date()).check(z.maxLength(30))
  })
  .check(
    z.refine((value) => value.scoredEvidenceCount <= value.evidenceCount, {
      path: ["scoredEvidenceCount"]
    }),
    z.refine(
      (value) =>
        (value.masteryScore === null) === (value.scoredEvidenceCount === 0),
      { path: ["masteryScore"] }
    ),
    z.refine((value) => value.confirmations <= value.evidenceCount, {
      path: ["confirmations"]
    }),
    z.refine(
      (value) =>
        (value.confirmations === 0) === (value.firstConfirmedAt === null) &&
        (value.confirmations === 0) === (value.lastConfirmedAt === null),
      { path: ["confirmations"] }
    ),
    z.refine(
      (value) =>
        (value.confirmations === 0) === (value.confirmedDays.length === 0) &&
        value.confirmedDays.length <= value.confirmations &&
        value.confirmedDays.every(
          (day, index) =>
            index === 0 || day > (value.confirmedDays[index - 1] ?? "")
        ),
      { path: ["confirmedDays"] }
    )
  );

export const clientOwnSkillsSchema = z.strictObject({
  skills: z.array(ownSkill).check(z.maxLength(2000))
});
