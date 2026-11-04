import { brand } from "@platform/brand";
import { isSqlCheck, type Challenge } from "@platform/checks";
import type { SqlJob } from "../sql/sql-engine";

/*
 * Challenge types, parsing and the static HTML/CSS checks live in @platform/checks, shared with
 * the API. What stays here is browser-only: the SQL job, the code hash and the storage key.
 */
export {
  isRunCheck,
  isRunnable,
  isSqlCheck,
  parseChallenge,
  runChecks,
  staticPage,
  type Challenge,
  type ChallengeCheck
} from "@platform/checks";

/** What the SQL engine runs for a challenge: the learner's code on the starting database, with the query checks. */
export const sqlJob = (challenge: Challenge, code: string): SqlJob => ({
  code,
  base: challenge.db,
  setup: challenge.setup,
  checks: challenge.checks
    .filter(isSqlCheck)
    .map(({ sql, rows, ordered, names }) => ({ sql, rows, ordered, names }))
});

export function hashText(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}

export function storageKey(challenge: Challenge) {
  let h = 0;
  for (const ch of challenge.title + challenge.start)
    h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `${brand.slug}:challenge:${(h >>> 0).toString(36)}`;
}
