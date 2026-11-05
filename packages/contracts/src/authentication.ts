import { z } from "zod";

import { registrationConsentsSchema } from "./legal";

export const authenticationEmailSchema = z
  .string()
  .trim()
  .max(320)
  .pipe(z.email());

export const passwordSchema = z.string().min(15).max(128);

export const registerRequestSchema = z.object({
  email: authenticationEmailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(160).optional(),
  consents: registrationConsentsSchema
});

export const loginRequestSchema = z.object({
  email: authenticationEmailSchema,
  password: passwordSchema
});

/** Password reset (ADR-0082): the token travels only in the link's fragment. */
export const passwordResetTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const passwordResetRequestSchema = z
  .object({ email: authenticationEmailSchema })
  .strict();

export const passwordResetConfirmSchema = z
  .object({ token: passwordResetTokenSchema, password: passwordSchema })
  .strict();

export const passwordResetAvailabilitySchema = z
  .object({ available: z.boolean() })
  .strict();

export const oauthProviderSchema = z.enum(["google", "github"]);

export const oauthProvidersResponseSchema = z.object({
  providers: z.array(oauthProviderSchema)
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
export type OAuthProvidersResponse = z.infer<
  typeof oauthProvidersResponseSchema
>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;
export type PasswordResetAvailability = z.infer<
  typeof passwordResetAvailabilitySchema
>;
