import { uuidSchema } from "@platform/contracts";

/**
 * The idempotency key of a purchase attempt for one price. It is reused for
 * every retry in this tab (sessionStorage, or page memory when storage is
 * unavailable), so a retried checkout never creates a second purchase.
 */
export function attemptKey(
  memory: Map<string, string>,
  organizationSlug: string,
  productSlug: string,
  priceId: string
): string {
  const storageKey = `checkout-attempt:${organizationSlug}:${productSlug}:${priceId}`;
  const runtime = memory.get(storageKey);
  if (runtime !== undefined) return runtime;

  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored !== null && uuidSchema.safeParse(stored).success) {
      memory.set(storageKey, stored);
      return stored;
    }
  } catch {
    // Runtime memory below still preserves retry idempotency for this page life.
  }

  const created = crypto.randomUUID();
  memory.set(storageKey, created);
  try {
    window.sessionStorage.setItem(storageKey, created);
  } catch {
    // Storage can be unavailable in privacy modes; runtime memory is sufficient.
  }
  return created;
}
