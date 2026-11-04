import data from "./story.json";

/**
 * Branch scenes of the season-1 script (`docs/story/season-1.md`, built by
 * `docs/examples/skill-map/build.mjs`). Server pages read it and pass only one
 * character's scenes to the client, so the whole season never ships to the browser.
 */
export type SpeakerId =
  | "nika"
  | "kremen"
  | "bro"
  | "zodchy"
  | "kist"
  | "iskra"
  | "slon"
  | "lev"
  | "bug";
export type SceneLine = readonly [SpeakerId, string];
export type BranchScene = {
  intro: SceneLine[];
  boss: SceneLine[] | null;
  outro: SceneLine[];
};

// The builder checks speakers and lengths; story.test.ts checks the shape.
const STORY = data as unknown as Record<string, BranchScene>;

export function scenesFor(branchIds: readonly string[]) {
  return Object.fromEntries(
    branchIds.flatMap((id) => {
      const scene = STORY[id];
      return scene ? [[id, scene] as const] : [];
    })
  );
}

/** Who speaks: name and colour of each voice in the scenes. */
export const CAST: Record<SpeakerId, { name: string; color: string }> = {
  nika: { name: "Ника", color: "#d9f99d" },
  kremen: { name: "Кремень", color: "#d4d4d8" },
  bro: { name: "Бро", color: "#7dd3fc" },
  zodchy: { name: "Зодчий", color: "#bef264" },
  kist: { name: "Кисть", color: "#d8b4fe" },
  iskra: { name: "Искра", color: "#fcd34d" },
  slon: { name: "Слон", color: "#5eead4" },
  lev: { name: "Лев", color: "#a5b4fc" },
  bug: { name: "Баг", color: "#fda4af" }
};
