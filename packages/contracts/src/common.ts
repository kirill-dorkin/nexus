import { z } from "zod";

export const uuidSchema = z.uuid();

export const resourceSlugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const organizationSlugSchema = resourceSlugSchema;

/** The body of a 400 response produced by API request validation. */
export const apiValidationErrorSchema = z.object({
  message: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() }))
});
export type ApiValidationError = z.infer<typeof apiValidationErrorSchema>;
