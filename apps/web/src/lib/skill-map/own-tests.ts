"use client";
import { HOME_ORGANIZATION_SLUG } from "../public-learning-routes";
import { useApiResource } from "../hooks/api-resource";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Parses `GET /v1/me/skills/{org}/tests`: the skill keys the caller can take a test of
 * (ADR-0075). Schema-free like `ownSkillRecordsParser`, so character pages load no validator.
 */
export const ownSkillTestsParser = {
  parse(value: unknown): ReadonlySet<string> {
    const keys =
      typeof value === "object" && value !== null && "skillKeys" in value
        ? value.skillKeys
        : null;
    if (!Array.isArray(keys)) throw new Error("Unexpected skill tests response.");
    return new Set(
      keys.filter(
        (key): key is string => typeof key === "string" && SLUG.test(key)
      )
    );
  }
};

export const ownSkillTestsPath = (organizationSlug = HOME_ORGANIZATION_SLUG) =>
  `/v1/me/skills/${encodeURIComponent(organizationSlug)}/tests`;

const NONE: ReadonlySet<string> = new Set();

/** Skills with a test for the caller; anonymous visitors and errors read as none. */
export function useOwnSkillTests(): ReadonlySet<string> {
  const [resource] = useApiResource(ownSkillTestsPath(), ownSkillTestsParser);
  return resource.status === "ready" ? resource.data : NONE;
}

/** The test page of one skill of a character. */
export const skillTestHref = (characterSlug: string, skillKey: string) =>
  `/characters/${encodeURIComponent(characterSlug)}/skills/${encodeURIComponent(skillKey)}/test`;
