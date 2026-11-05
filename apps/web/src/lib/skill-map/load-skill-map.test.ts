import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { readSkillMap } = await import("./load-skill-map");
const { SKILL_MAP } = await import("./skill-map");

const published = {
  schemaVersion: 2,
  unlockShare: 0.6,
  maxLevel: 50,
  characters: [
    {
      slug: "db",
      name: "База",
      role: "Хранитель",
      summary: "Карта из API для теста.",
      accent: "teal",
      published: true,
      abilities: [{ title: "Всё", branches: ["db-1"] }],
      branches: [
        {
          id: "db-1",
          title: "Старт",
          depth: "core",
          requires: [],
          skills: [
            { key: "db-a", title: "A", lesson: null, prerequisites: [] },
            { key: "db-b", title: "B", lesson: null, prerequisites: ["db-a"] }
          ]
        }
      ]
    }
  ]
};
const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" }
    })
  );

describe("readSkillMap (ADR-0078)", () => {
  const old = process.env.API_INTERNAL_URL;
  beforeEach(() => {
    process.env.API_INTERNAL_URL = "http://api.internal.test";
  });
  afterEach(() => {
    if (old === undefined) delete process.env.API_INTERNAL_URL;
    else process.env.API_INTERNAL_URL = old;
  });

  it("reads the published map of the home organization", async () => {
    const read = vi.fn(() => json({ organizationSlug: "nexus", map: published }));
    const map = await readSkillMap(read);
    expect(read).toHaveBeenCalledWith(
      "http://api.internal.test/v1/public/skill-map/nexus"
    );
    expect(map.version).toBe(1);
    expect(map.unlockShare).toBe(0.6);
    expect(map.characters.map((c) => c.slug)).toEqual(["db"]);
    expect(map.characters[0]!.branches[0]!.skills[1]).toMatchObject({
      key: "db-b",
      prerequisites: ["db-a"]
    });
  });

  it("falls back to the bundled map while none is published", async () => {
    expect(
      await readSkillMap(() => json({ organizationSlug: "nexus", map: null }))
    ).toBe(SKILL_MAP);
  });

  it("falls back when the API fails, times out or answers nonsense", async () => {
    expect(await readSkillMap(() => json({}, 503))).toBe(SKILL_MAP);
    expect(
      await readSkillMap(() => Promise.reject(new Error("timeout")))
    ).toBe(SKILL_MAP);
    expect(
      await readSkillMap(() =>
        json({ organizationSlug: "nexus", map: { schemaVersion: 1 } })
      )
    ).toBe(SKILL_MAP);
    delete process.env.API_INTERNAL_URL;
    // Same-origin mode without an internal binding cannot read; the page still renders.
    const origin = process.env.NEXT_PUBLIC_API_ORIGIN;
    process.env.NEXT_PUBLIC_API_ORIGIN = "/";
    expect(await readSkillMap(() => json({}))).toBe(SKILL_MAP);
    if (origin === undefined) delete process.env.NEXT_PUBLIC_API_ORIGIN;
    else process.env.NEXT_PUBLIC_API_ORIGIN = origin;
  });
});
