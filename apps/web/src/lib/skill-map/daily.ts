import {
  SKILL_MAP,
  characterProgress,
  type Character,
  type RecordsByKey,
  type SkillMap,
  type SkillMapSkill
} from "./skill-map";

/**
 * Daily quests, the streak and the player level (characters spec v3, section 5.6). All derived
 * from the learner's confirmation days; nothing is stored, so they cannot be farmed or drift.
 */
export type DailyQuest = {
  kind: "repeat" | "recall" | "confirm";
  character: Character;
  skill: SkillMapSkill;
  /** Done today: the skill has a confirmation dated today. */
  done: boolean;
};

const DAY = 86_400_000;
const shift = (day: string, by: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + by * DAY)
    .toISOString()
    .slice(0, 10);

/**
 * Up to three quests: a fading skill to repeat (or a forgotten one to recall) and the next skill
 * to confirm, taken across characters in map order. A quest confirmed today stays listed as done.
 */
export function dailyQuests(
  records: RecordsByKey,
  today: string,
  map: SkillMap = SKILL_MAP,
  limit = 3
): DailyQuest[] {
  const confirmedToday = (key: string) =>
    records.get(key)?.confirmedDays.includes(today) ?? false;
  // Skills confirmed today read as they were yesterday, so finishing a quest keeps it on the list.
  const before = new Map(
    [...records].map(([key, record]) => [
      key,
      { confirmedDays: record.confirmedDays.filter((d) => d < today) }
    ])
  );
  const pick: DailyQuest[] = [];
  const seen = new Set<string>();
  const take = (kind: DailyQuest["kind"]) => {
    for (const character of map.characters) {
      if (!character.published) continue;
      const progress = characterProgress(character, before, today, map);
      const state =
        kind === "repeat" ? "fading" : kind === "recall" ? "forgotten" : "open";
      const found = progress.branches
        .flatMap((b) => b.skills)
        .find((s) => s.state === state && !seen.has(s.skill.key));
      if (found) {
        seen.add(found.skill.key);
        return pick.push({
          kind,
          character,
          skill: found.skill,
          done: confirmedToday(found.skill.key)
        });
      }
    }
    return 0;
  };
  if (!take("repeat")) take("recall");
  take("confirm");
  // The third slot: another repeat if anything fades, otherwise another new skill.
  if (!take("repeat")) take("confirm");
  return pick.slice(0, limit);
}

/** Days in a row with at least one confirmation, ending today or yesterday. */
export function streak(records: RecordsByKey, today: string): number {
  const days = new Set([...records.values()].flatMap((r) => r.confirmedDays));
  let day = days.has(today) ? today : shift(today, -1);
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day = shift(day, -1);
  }
  return count;
}

export const PLAYER_TITLES = [
  { from: 0, title: "Новичок" },
  { from: 50, title: "Подмастерье" },
  { from: 150, title: "Инженер" },
  { from: 300, title: "Архитектор" },
  { from: 500, title: "Хранитель Нексуса" }
] as const;

/** Player level = sum of character levels; the title follows it. */
export function playerLevel(
  records: RecordsByKey,
  today: string,
  map: SkillMap = SKILL_MAP
): { level: number; title: string } {
  const level = map.characters.reduce(
    (sum, c) => sum + characterProgress(c, records, today, map).level,
    0
  );
  let title: string = PLAYER_TITLES[0].title;
  for (const t of PLAYER_TITLES) if (level >= t.from) title = t.title;
  return { level, title };
}
