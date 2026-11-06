import type * as THREE from "three";
import type { Kit, Palette } from "./kit";

/** What a character's body hands back to the shared look-by-level and animation code. */
export type Parts = {
  torso: THREE.Object3D;
  head: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  /** The left eye's dark cover at rank 1; hidden from rank 2. */
  deadEye: THREE.Object3D;
  core: THREE.Object3D | null;
  headY: number;
  /** Always hovers a little (the Browser's coat). */
  floats?: number;
  /** Seams glow from rank 2 instead of rank 4 (SQL rings, CSS frames). */
  seamsEarly?: boolean;
  /** Turning parts, driven while the character is awake. */
  wheels?: THREE.Object3D[];
  spinners?: THREE.Object3D[];
  springs?: THREE.Object3D[];
  swayers?: THREE.Object3D[];
  globe?: THREE.Object3D;
  needle?: THREE.Object3D;
  rows?: THREE.Object3D[];
  paint?: THREE.Mesh;
  column?: THREE.Mesh;
};

export type CharacterDef = {
  slug: string;
  pal: Palette;
  /** Page accent while the character is shown: action, light, deep, background. */
  ui: readonly [string, string, string, string];
  /** Rank 4 title, e.g. «Мастер тегов». */
  master: string;
  /** What each of the five ranks looks like, for the rank list. */
  stages: readonly [string, string, string, string, string];
  orbit: readonly string[];
  build(kit: Kit, body: THREE.Group): Parts;
  crest(kit: Kit, group: THREE.Group): THREE.Object3D | null;
  wing(kit: Kit, side: -1 | 1, pivot: THREE.Group): void;
};

/** Level thresholds of the five ranks (0–100). */
export const RANK_FROM = [0, 20, 40, 60, 80] as const;

export const rankNames = (def: Pick<CharacterDef, "master">) =>
  [
    "Каменный",
    "Пробуждённый",
    "Бронированный",
    def.master,
    "Легендарный"
  ] as const;

/** Index of the rank (0–4) for a level from 0 to 100. */
export function rankIndex(level: number): number {
  let index = 0;
  RANK_FROM.forEach((from, i) => {
    if (level >= from) index = i;
  });
  return index;
}
