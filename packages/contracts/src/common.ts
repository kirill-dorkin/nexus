import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const resourceSlugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const organizationSlugSchema = resourceSlugSchema;
