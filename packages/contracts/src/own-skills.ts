import { z } from "zod";

import { resourceSlugSchema } from "./common";

/**
 * ADR-0074 point 6: the caller's own Mastery and confirmations for every
 * organization Skill that has Evidence, keyed by `skillKey`. A confirmation is
 * a passing Evidence record; Web derives levels and skill decay from these.
 */
/** `skill-freshness@1` computed by the API over every confirmation day (ADR-0076). */
export const ownSkillFreshnessSchema = z
  .object({
    policy: z.literal("skill-freshness@1"),
    state: z.enum(["unconfirmed", "confirmed", "fading", "forgotten"]),
    step: z.number().int().min(0).max(6),
    dueOn: z.iso.date().nullable(),
    forgottenAfter: z.iso.date().nullable()
  })
  .strict()
  .refine(
    (value) =>
      (value.state === "unconfirmed") === (value.step === 0) &&
      (value.step === 0) === (value.dueOn === null) &&
      (value.dueOn === null) === (value.forgottenAfter === null),
    { message: "an unconfirmed skill has no step and no dates" }
  );

export const ownSkillSchema = z
  .object({
    skillKey: resourceSlugSchema,
    masteryScore: z.number().min(0).max(1).nullable(),
    evidenceCount: z.number().int().positive(),
    scoredEvidenceCount: z.number().int().nonnegative(),
    lastEvidenceAt: z.iso.datetime(),
    confirmations: z.number().int().nonnegative(),
    firstConfirmedAt: z.iso.datetime().nullable(),
    lastConfirmedAt: z.iso.datetime().nullable(),
    /** Distinct UTC dates with a confirmation, ascending, the latest 30. */
    confirmedDays: z.array(z.iso.date()).max(30),
    freshness: ownSkillFreshnessSchema
  })
  .strict()
  .superRefine((value, context) => {
    if (value.scoredEvidenceCount > value.evidenceCount)
      context.addIssue({
        code: "custom",
        message: "scoredEvidenceCount cannot exceed evidenceCount",
        path: ["scoredEvidenceCount"]
      });
    if ((value.masteryScore === null) !== (value.scoredEvidenceCount === 0))
      context.addIssue({
        code: "custom",
        message: "masteryScore is null exactly when no Evidence is scored",
        path: ["masteryScore"]
      });
    if (value.confirmations > value.evidenceCount)
      context.addIssue({
        code: "custom",
        message: "confirmations cannot exceed evidenceCount",
        path: ["confirmations"]
      });
    const none = value.confirmations === 0;
    if (
      none !== (value.firstConfirmedAt === null) ||
      none !== (value.lastConfirmedAt === null)
    )
      context.addIssue({
        code: "custom",
        message: "confirmation times are null exactly when there are none",
        path: ["confirmations"]
      });
    if (none !== (value.freshness.state === "unconfirmed"))
      context.addIssue({
        code: "custom",
        message:
          "freshness is unconfirmed exactly when there are no confirmations",
        path: ["freshness"]
      });
    if (
      none !== (value.confirmedDays.length === 0) ||
      value.confirmedDays.length > value.confirmations ||
      value.confirmedDays.some(
        (day, index) =>
          index > 0 && day <= (value.confirmedDays[index - 1] ?? "")
      )
    )
      context.addIssue({
        code: "custom",
        message:
          "confirmedDays are distinct ascending dates, one per confirmed day",
        path: ["confirmedDays"]
      });
  });

export const ownSkillsSchema = z
  .object({ skills: z.array(ownSkillSchema).max(2000) })
  .strict();

export type OwnSkill = z.infer<typeof ownSkillSchema>;
export type OwnSkills = z.infer<typeof ownSkillsSchema>;
