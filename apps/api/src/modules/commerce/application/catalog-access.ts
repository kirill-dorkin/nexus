import type { CatalogAccess } from "@platform/contracts";

import type { CatalogEntitlementState } from "./subscription.repository";

/** ADR-0087 §3: full access for the first days after the account was created, without a card. */
export const TRIAL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A paid or manual catalog Entitlement wins; otherwise the trial; otherwise no access. */
export function resolveCatalogAccess(
  entitlement: CatalogEntitlementState | null,
  accountCreatedAt: string,
  now: Date
): CatalogAccess {
  const trialEndsAt = new Date(
    new Date(accountCreatedAt).getTime() + TRIAL_DAYS * DAY_MS
  ).toISOString();
  if (entitlement)
    return {
      access: entitlement.grantSource,
      until: entitlement.expiresAt,
      trialEndsAt
    };
  if (now.getTime() < new Date(trialEndsAt).getTime())
    return { access: "trial", until: trialEndsAt, trialEndsAt };
  return { access: "none", until: null, trialEndsAt };
}
