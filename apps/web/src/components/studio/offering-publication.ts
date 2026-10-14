import {
  organizationSlugSchema,
  resourceSlugSchema,
  type LearningOffering,
  type LearningOfferingList
} from "@platform/contracts";

/** This URL is presentation only, never proof of learner eligibility. */
export function publicOfferingUrl(origin: string, organizationSlug: string, offeringSlug: string) {
  const url = new URL(origin);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.origin !== origin ||
    !organizationSlugSchema.safeParse(organizationSlug).success ||
    !resourceSlugSchema.safeParse(offeringSlug).success
  ) {
    throw new Error("Invalid public Offering address.");
  }
  return new URL(`/learn/${organizationSlug}/${offeringSlug}`, url).href;
}

export function isShareableFreeOffering(
  offering: Pick<LearningOffering, "visibility" | "status" | "deliveryMode" | "accessMode">
): boolean {
  return (
    offering.visibility === "public" &&
    offering.status === "open" &&
    offering.deliveryMode === "self_paced" &&
    offering.accessMode === "membership"
  );
}

/** A cursor is an ordering locator, never a substitute for release authority. */
export function appendOfferingPage(
  existing: LearningOffering[],
  page: LearningOfferingList,
  publishedVersionId: string
): LearningOffering[] {
  if (page.offerings.some((offering) => offering.courseVersionId !== publishedVersionId)) {
    throw new Error("Offering page belongs to a different published release.");
  }
  if (
    page.nextCursor !== null &&
    page.offerings.at(-1)?.id !== page.nextCursor
  ) {
    throw new Error("Invalid Offering pagination cursor.");
  }
  const seen = new Set(existing.map((offering) => offering.id));
  if (page.offerings.some((offering) => seen.has(offering.id))) {
    throw new Error("Duplicate Offering between pages.");
  }
  if (new Set(page.offerings.map((offering) => offering.id)).size !== page.offerings.length) {
    throw new Error("Duplicate Offering within page.");
  }
  return [...existing, ...page.offerings];
}
