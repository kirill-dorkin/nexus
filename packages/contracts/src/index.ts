import { z } from "zod";

export const problemDetailsSchema = z.object({
  type: z.string().default("about:blank"),
  title: z.string(),
  status: z.number().int().min(100).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
  code: z.string().optional(),
  correlationId: z.string().optional()
});

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

export * from "./common";
export * from "./identity";
export * from "./organizations";
export * from "./authorization";
export * from "./authentication";
export * from "./legal";
export * from "./commerce";
export * from "./public-catalog";
export * from "./github-integration";
export * from "./guided-build";
export * from "./learning-content";
export * from "./course-manifest";
export * from "./learning-delivery";
export * from "./learning-graph";
export * from "./learning-history";
export * from "./learning-progress";
export * from "./learning-validation";
export * from "./mastery";
export * from "./projects";
export * from "./readiness";
export * from "./recommendations";

export * from "./public-learning";
export * from "./learner-learning";

export * from "./quiz-check";
export * from "./studio";
export * from "./web-telemetry";
export * from "./web-telemetry-names";
