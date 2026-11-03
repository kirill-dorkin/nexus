import { z } from "zod";

export const eventEnvelopeSchema = z.object({
  eventId: z.string().min(1),
  eventName: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/),
  eventVersion: z.number().int().positive(),
  occurredAt: z.iso.datetime({ offset: true }),
  receivedAt: z.iso.datetime({ offset: true }),
  organizationId: z.string().min(1).optional(),
  actor: z.object({
    type: z.enum(["user", "system", "github", "grader"]),
    id: z.string().min(1).optional()
  }),
  subjectUserId: z.string().min(1).optional(),
  context: z
    .object({
      enrollmentId: z.string().optional(),
      offeringId: z.string().optional(),
      courseRunId: z.string().optional(),
      groupId: z.string().optional(),
      teamId: z.string().optional(),
      courseVersionId: z.string().optional(),
      lessonVersionId: z.string().optional(),
      activityVersionId: z.string().optional(),
      attemptId: z.string().optional(),
      projectRunId: z.string().optional()
    })
    .default({}),
  skillIds: z.array(z.string()).default([]),
  source: z.string().min(1),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  privacyClass: z
    .enum(["public", "internal", "personal", "sensitive"])
    .default("internal"),
  payload: z.record(z.string(), z.unknown()).default({})
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
