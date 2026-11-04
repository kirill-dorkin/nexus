/**
 * Skill freshness `skill-freshness@1` (characters spec v3, section 5.4): a confirmed skill stays
 * active for a term that grows with each spaced confirmation, fades for a grace period and is then
 * forgotten. It is derived only from the days on which the learner had passing Evidence for the
 * skill, so it needs no stored state and cannot drift from the learning history.
 */
export const FRESHNESS_POLICY = {
  key: "skill-freshness",
  version: 1,
  /** Days until the next repetition after the 1st, 2nd, … confirmation step. */
  intervals: [3, 7, 21, 60, 180, 365],
  graceDays: 7
} as const;

export type Freshness = "unconfirmed" | "confirmed" | "fading" | "forgotten";

export type FreshnessState = {
  state: Freshness;
  /** 0 before the first confirmation, then 1…intervals.length. */
  step: number;
  /** Day the skill should be repeated by (UTC `YYYY-MM-DD`), or null when unconfirmed. */
  dueOn: string | null;
  /** Day after which the skill is forgotten, or null when unconfirmed. */
  forgottenAfter: string | null;
};

const DAY = 86_400_000;
const toDay = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY);
const fromDay = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);

/**
 * Walks the confirmation days in order. A confirmation in the second half of the term or during
 * grace moves one step up; an earlier one only restarts the current term; one after the skill was
 * forgotten moves one step down (memory weakened, so the next term is shorter).
 */
export function skillFreshness(
  confirmedDays: readonly string[],
  today: string,
  policy: {
    intervals: readonly number[];
    graceDays: number;
  } = FRESHNESS_POLICY
): FreshnessState {
  const days = [...new Set(confirmedDays)].map(toDay).sort((a, b) => a - b);
  const term = (step: number) =>
    policy.intervals[Math.min(step, policy.intervals.length) - 1] ?? 0;
  let step = 0;
  let due = 0;
  for (const day of days) {
    if (step === 0) {
      step = 1;
    } else if (day > due + policy.graceDays) {
      step = Math.max(step - 1, 1);
    } else if (day >= due - term(step) / 2) {
      step = Math.min(step + 1, policy.intervals.length);
    }
    due = day + term(step);
  }
  if (step === 0)
    return {
      state: "unconfirmed",
      step: 0,
      dueOn: null,
      forgottenAfter: null
    };
  const now = toDay(today);
  const forgottenAfter = due + policy.graceDays;
  return {
    state:
      now <= due ? "confirmed" : now <= forgottenAfter ? "fading" : "forgotten",
    step,
    dueOn: fromDay(due),
    forgottenAfter: fromDay(forgottenAfter)
  };
}

/** Active skills count towards levels and unlock what stands on them. */
export const isActive = (state: Freshness) =>
  state === "confirmed" || state === "fading";
