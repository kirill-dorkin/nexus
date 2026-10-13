import { z } from "zod";

import { uuidSchema } from "./common";

export const identityUserSchema = z.object({
  id: uuidSchema,
  email: z.string().email().max(320),
  displayName: z.string().nullable(),
  status: z.enum(["active", "suspended", "deleted"])
});

export type IdentityUser = z.infer<typeof identityUserSchema>;
