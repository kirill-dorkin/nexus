import {
  learningOfferingListSchema,
  ownOrganizationsSchema,
  studioDraftSchema,
  type LearningOffering,
  type StudioDraft
} from "@platform/contracts";
import { appendOfferingPage } from "../offering-publication";
import { StudioError, studioRequest } from "../studio-api";

export type AccessState = {
  course: StudioDraft;
  organizationSlug: string;
  offerings: LearningOffering[];
  cursor: string | null;
};

/** The slug of an organization the signed-in user belongs to, following pages. */
async function ownOrganizationSlug(organizationId: string): Promise<string> {
  let cursor: string | null = null;
  const seen = new Set<string>();
  for (let page = 0; page < 100; page++) {
    const result = ownOrganizationsSchema.parse(
      await studioRequest(`me/organizations${cursor ? `?after=${cursor}` : ""}`)
    );
    const own = result.organizations.find((o) => o.id === organizationId);
    if (own) return own.slug;
    if (result.nextCursor === null) break;
    if (seen.has(result.nextCursor))
      throw new Error("Повторяющийся курсор организаций.");
    seen.add(result.nextCursor);
    cursor = result.nextCursor;
  }
  throw new Error("Организация недоступна в вашем аккаунте.");
}

export function offeringsPath(organizationId: string) {
  return `organizations/${organizationId}/offerings`;
}

/** The next page of offerings of the published version. */
export async function offeringPage(
  organizationId: string,
  versionId: string,
  existing: LearningOffering[],
  after: string | null
) {
  const page = learningOfferingListSchema.parse(
    await studioRequest(
      `${offeringsPath(organizationId)}?courseVersionId=${versionId}${after ? `&after=${after}` : ""}`
    )
  );
  return {
    offerings: appendOfferingPage(existing, page, versionId),
    cursor: page.nextCursor
  };
}

/** Reads the course, the organization address and the first page of offerings. */
export async function loadAccess(
  organizationId: string,
  courseId: string
): Promise<AccessState> {
  // Read only. Every later command is still separately authorized by API.
  const [raw, organizationSlug] = await Promise.all([
    studioRequest(`organizations/${organizationId}/studio/courses/${courseId}`),
    ownOrganizationSlug(organizationId)
  ]);
  const course = studioDraftSchema.parse(raw);
  if (course.courseId !== courseId) throw new Error("Курс изменился.");
  const first =
    course.status === "published"
      ? await offeringPage(organizationId, course.versionId, [], null)
      : { offerings: [], cursor: null };
  return { course, organizationSlug, ...first };
}

export function requestError(error: unknown): string {
  if (error instanceof StudioError && error.status === 401)
    return "Войдите в Studio и попробуйте снова.";
  if (error instanceof StudioError && error.status === 403)
    return "У вас нет прав управления доступом к этому курсу.";
  return error instanceof Error
    ? error.message
    : "Не удалось выполнить запрос.";
}
