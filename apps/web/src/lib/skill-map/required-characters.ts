import { SKILL_MAP, type Character, type SkillMap } from "./skill-map";

/** Characters whose branches this character's branches require, in map order. */
export function requiredCharacters(
  character: Character,
  map: SkillMap = SKILL_MAP
): Character[] {
  const owner = new Map(
    map.characters.flatMap((c) => c.branches.map((b) => [b.id, c] as const))
  );
  const needed = new Set(
    character.branches
      .flatMap((b) => b.requires)
      .map((id) => owner.get(id))
      .filter(
        (c): c is Character => c !== undefined && c.slug !== character.slug
      )
  );
  return map.characters.filter((c) => needed.has(c));
}
