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
