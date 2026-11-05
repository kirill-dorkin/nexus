import { describe, expect, it } from "vitest";

import { SKILL_MAP } from "./skill-map";
import { UPCOMING } from "./upcoming";

describe("upcoming characters", () => {
  it("announces new characters only, each once and standing on a known one", () => {
    const current = SKILL_MAP.characters.map((c) => c.name);
    const upcoming = UPCOMING.flatMap((d) => d.characters.map((c) => c.name));
    expect(new Set(upcoming).size).toBe(upcoming.length);
    for (const name of upcoming) expect(current).not.toContain(name);
    const known = new Set([...current, ...upcoming]);
    for (const character of UPCOMING.flatMap((d) => d.characters))
      for (const need of character.needs.split(", "))
        expect(known.has(need), `${character.name} needs ${need}`).toBe(true);
  });
});
