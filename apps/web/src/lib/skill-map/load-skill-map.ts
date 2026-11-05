import "server-only";
import { publicSkillMapSchema, type SkillMapManifestV2 } from "@platform/contracts";
import { cache } from "react";

import { HOME_ORGANIZATION_SLUG } from "../public-learning-routes";
import { serverApiUrl } from "../server-api";
import { SKILL_MAP, type SkillMap } from "./skill-map";

/** Character pages refresh the published map at most this often (seconds). */
export const SKILL_MAP_REVALIDATE_SECONDS = 300;

/** The published `skill-map@2` as the map Web's progress functions read (`prerequisites` stay). */
export function fromPublished(map: SkillMapManifestV2): SkillMap {
  return {
    version: 1,
    unlockShare: map.unlockShare,
    maxLevel: map.maxLevel,
    characters: map.characters
  };
}

/**
 * The skill map for server pages (ADR-0078): the organization's published version from
 * `GET /v1/public/skill-map/{org}`, or the map bundled into Web while none is published, the API
 * is unreachable or its answer does not parse. Pages never fail because of the map.
 */
export async function readSkillMap(
  read: (url: string) => Promise<Response> = (url) =>
    fetch(url, {
      next: { revalidate: SKILL_MAP_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000)
    })
): Promise<SkillMap> {
  try {
    const response = await read(
      serverApiUrl(
        `/v1/public/skill-map/${encodeURIComponent(HOME_ORGANIZATION_SLUG)}`
      )
    );
    if (!response.ok) return SKILL_MAP;
    const parsed = publicSkillMapSchema.safeParse(await response.json());
    return parsed.success && parsed.data.map
      ? fromPublished(parsed.data.map)
      : SKILL_MAP;
  } catch {
    return SKILL_MAP;
  }
}

export const loadSkillMap = cache(() => readSkillMap());
