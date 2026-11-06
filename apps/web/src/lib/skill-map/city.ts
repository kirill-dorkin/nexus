import {
  SKILL_MAP,
  characterProgress,
  type Character,
  type RecordsByKey,
  type SkillMap
} from "./skill-map";

/**
 * The city of the season-1 script (section 2): one district per character, roads where a
 * character builds on another, and three looks that follow the share of active skills.
 */
export type DistrictState = "ruined" | "scaffolding" | "alive";

export const districtState = (activeShare: number): DistrictState =>
  activeShare >= 1 ? "alive" : activeShare >= 0.2 ? "scaffolding" : "ruined";

export const DISTRICT_NAMES: Record<string, string> = {
  pc: "Машинный зал",
  browser: "Ворота в Сеть",
  html: "Квартал Каркасов",
  css: "Галерея",
  js: "Мастерские",
  sql: "Архив",
  terminal: "Пульт",
  git: "Архив времени",
  ts: "Сторожевая башня",
  node: "Машинное отделение",
  react: "Мастерская интерфейсов",
  network: "Почтамт",
  python: "Библиотека",
  docker: "Порт"
};

/** Positions on a 1000×600 plan; characters without one are laid out on the bottom row. */
const LAYOUT: Record<string, { x: number; y: number }> = {
  pc: { x: 130, y: 140 },
  browser: { x: 400, y: 140 },
  html: { x: 680, y: 140 },
  css: { x: 680, y: 330 },
  js: { x: 680, y: 510 },
  sql: { x: 400, y: 420 },
  terminal: { x: 130, y: 330 },
  git: { x: 130, y: 510 },
  ts: { x: 860, y: 510 },
  node: { x: 860, y: 330 },
  react: { x: 680, y: 420 },
  network: { x: 400, y: 330 },
  python: { x: 860, y: 140 },
  docker: { x: 270, y: 240 }
};

export type District = {
  character: Character;
  name: string;
  x: number;
  y: number;
  level: number;
  state: DistrictState;
};

export type Road = { from: string; to: string };

export function cityPlan(
  records: RecordsByKey,
  today: string,
  map: SkillMap = SKILL_MAP
): { districts: District[]; roads: Road[] } {
  let spare = 0;
  const districts = map.characters.map((character): District => {
    const progress = characterProgress(character, records, today, map);
    const place = LAYOUT[character.slug] ?? {
      x: 130 + 180 * spare++,
      y: 560
    };
    return {
      character,
      name: DISTRICT_NAMES[character.slug] ?? character.name,
      ...place,
      level: progress.level,
      state: districtState(
        progress.total === 0 ? 0 : progress.active / progress.total
      )
    };
  });
  const owner = new Map(
    map.characters.flatMap((c) =>
      c.branches.map((b) => [b.id, c.slug] as const)
    )
  );
  const roads = new Map<string, Road>();
  for (const character of map.characters)
    for (const branch of character.branches)
      for (const id of branch.requires) {
        const from = owner.get(id);
        if (from && from !== character.slug) {
          const key = [from, character.slug].sort().join("|");
          roads.set(key, { from, to: character.slug });
        }
      }
  // The script's main street: the machine room opens the gates.
  roads.set("browser|pc", { from: "pc", to: "browser" });
  roads.set("browser|sql", { from: "browser", to: "sql" });
  return { districts, roads: [...roads.values()] };
}
