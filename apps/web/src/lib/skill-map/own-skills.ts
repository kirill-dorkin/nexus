"use client";
import { HOME_ORGANIZATION_SLUG } from "../public-learning-routes";
import { useApiResource, type Resource } from "../hooks/api-resource";
import type { FreshnessState } from "./freshness";
import type { RecordsByKey, SkillRecord } from "./skill-map";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STATES = new Set(["unconfirmed", "confirmed", "fading", "forgotten"]);
const dayOrNull = (value: unknown) =>
  value === null || (typeof value === "string" && DAY.test(value));

/** The API's `skill-freshness@1` result, or undefined when absent or malformed. */
function parseFreshness(value: unknown): FreshnessState | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { policy, state, step, dueOn, forgottenAfter } = value as Record<
    string,
    unknown
  >;
  if (
    policy !== "skill-freshness@1" ||
    typeof state !== "string" ||
    !STATES.has(state) ||
    typeof step !== "number" ||
    !Number.isInteger(step) ||
    !dayOrNull(dueOn) ||
    !dayOrNull(forgottenAfter)
  )
    return undefined;
  return {
    state: state as FreshnessState["state"],
    step,
    dueOn: dueOn as string | null,
    forgottenAfter: forgottenAfter as string | null
  };
}

/**
 * Parses `GET /v1/me/skills/{org}` down to what the skill map needs: the confirmation days per
 * skill key. Hand-written and schema-free so character pages load no validator; anything that
 * does not match is dropped instead of trusted.
 */
export const ownSkillRecordsParser = {
  parse(value: unknown): RecordsByKey {
    const records = new Map<string, SkillRecord>();
    const skills =
      typeof value === "object" && value !== null && "skills" in value
        ? value.skills
        : null;
    if (!Array.isArray(skills)) throw new Error("Unexpected skills response.");
    for (const item of skills as unknown[]) {
      if (typeof item !== "object" || item === null) continue;
      const { skillKey, confirmedDays, freshness } = item as Record<
        string,
        unknown
      >;
      if (typeof skillKey !== "string" || !Array.isArray(confirmedDays))
        continue;
      records.set(skillKey, {
        confirmedDays: confirmedDays.filter(
          (day): day is string => typeof day === "string" && DAY.test(day)
        ),
        freshness: parseFreshness(freshness)
      });
    }
    return records;
  }
};

export const ownSkillsPath = (organizationSlug = HOME_ORGANIZATION_SLUG) =>
  `/v1/me/skills/${encodeURIComponent(organizationSlug)}`;

const EMPTY: RecordsByKey = new Map();

/** The caller's confirmations; anonymous visitors and a missing endpoint read as no progress. */
export function useOwnSkillRecords(): {
  status: Resource<RecordsByKey>["status"];
  records: RecordsByKey;
} {
  const [resource] = useApiResource(ownSkillsPath(), ownSkillRecordsParser);
  return {
    status: resource.status,
    records: resource.status === "ready" ? resource.data : EMPTY
  };
}

/** Today as a UTC calendar day, the unit of `skill-freshness@1`. */
export const utcToday = (now = new Date()) => now.toISOString().slice(0, 10);
