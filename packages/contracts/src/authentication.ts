import { z } from "zod";

export const authenticationEmailSchema = z
  .string()
  .trim()
  .email()
  .max(320);

export const passwordSchema = z
  .string()
  .min(15)
  .max(128);

export const registerRequestSchema = z.object({
  email: authenticationEmailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(160).optional()
});

export const loginRequestSchema = z.object({
  email: authenticationEmailSchema,
  password: passwordSchema
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
