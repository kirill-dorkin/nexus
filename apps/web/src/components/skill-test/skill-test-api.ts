"use client";
import type {
  SkillTestAnswer,
  SkillTestDraw,
  SkillTestResult
} from "@platform/contracts";
import {
  clientSkillTestCooldownSchema,
  clientSkillTestDrawSchema,
  clientSkillTestResultSchema
} from "@platform/contracts/client";

import { browserApiRequest } from "../../lib/public-api";

/** What a start or a submission came back with (ADR-0075). */
export type SkillTestReply<T> =
  | { kind: "ok"; data: T }
  | { kind: "anonymous" }
  | { kind: "unavailable" }
  | { kind: "cooldown"; retryAfter: string }
  | { kind: "busy" }
  | { kind: "invalid" }
  | { kind: "error" };

const testPath = (organizationSlug: string, skillKey: string) =>
  `/v1/me/learning/${encodeURIComponent(organizationSlug)}/skills/${encodeURIComponent(skillKey)}/tests`;

async function reply<T>(
  response: Response,
  schema: { parse(value: unknown): T }
): Promise<SkillTestReply<T>> {
  if (response.ok) return { kind: "ok", data: schema.parse(await response.json()) };
  if (response.status === 401) return { kind: "anonymous" };
  if (response.status === 404) return { kind: "unavailable" };
  if (response.status === 429) return { kind: "busy" };
  if (response.status === 400) return { kind: "invalid" };
  if (response.status === 409) {
    const cooldown = clientSkillTestCooldownSchema.safeParse(
      await response.json().catch(() => null)
    );
    if (cooldown.success)
      return { kind: "cooldown", retryAfter: cooldown.data.retryAfter };
  }
  return { kind: "error" };
}

async function safely<T>(
  request: () => Promise<SkillTestReply<T>>
): Promise<SkillTestReply<T>> {
  try {
    return await request();
  } catch {
    return { kind: "error" };
  }
}

export const startSkillTest = (
  organizationSlug: string,
  skillKey: string,
  drawKey: string
) =>
  safely<SkillTestDraw>(async () =>
    reply(
      await browserApiRequest(testPath(organizationSlug, skillKey), {
        method: "POST",
        body: JSON.stringify({ drawKey })
      }),
      clientSkillTestDrawSchema
    )
  );

export const submitSkillTest = (
  organizationSlug: string,
  skillKey: string,
  drawKey: string,
  answers: SkillTestAnswer[]
) =>
  safely<SkillTestResult>(async () =>
    reply(
      await browserApiRequest(
        `${testPath(organizationSlug, skillKey)}/${encodeURIComponent(drawKey)}/submission`,
        { method: "POST", body: JSON.stringify({ answers }) }
      ),
      clientSkillTestResultSchema
    )
  );

/** The open draw of a skill survives a reload, so the learner keeps the same questions. */
const drawStorageKey = (skillKey: string) => `skill-test-draw:${skillKey}`;

export function rememberedDrawKey(skillKey: string): string {
  try {
    const stored = sessionStorage.getItem(drawStorageKey(skillKey));
    if (stored) return stored;
  } catch {
    // Storage can be unavailable; a fresh key works the same.
  }
  const fresh = crypto.randomUUID();
  try {
    sessionStorage.setItem(drawStorageKey(skillKey), fresh);
  } catch {
    // See above.
  }
  return fresh;
}

export function forgetDrawKey(skillKey: string) {
  try {
    sessionStorage.removeItem(drawStorageKey(skillKey));
  } catch {
    // See above.
  }
}
