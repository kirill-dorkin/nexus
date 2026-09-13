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
