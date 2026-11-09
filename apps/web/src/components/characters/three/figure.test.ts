import { describe, expect, it } from "vitest";

import { buildFigure, headTop, step } from "./figure";
import { CHARACTER_DEFS, characterDef, hasBody } from "./roster";
import { rankIndex, rankNames } from "./types";

describe("character roster", () => {
  it("has the launch characters, each with its own palette", () => {
    expect(CHARACTER_DEFS.map((d) => d.slug)).toEqual([
      "pc",
      "browser",
      "html",
      "css",
      "js",
      "sql",
      "terminal",
      "git",
      "ts",
      "node",
      "react",
      "network",
      "python",
      "docker",
      "next",
      "go",
      "os",
      "vue",
      "cicd"
    ]);
    // Owner decision 2026-11-06: characters differ in body and colour.
    const bases = new Set(CHARACTER_DEFS.map((d) => d.pal.base));
    const glows = new Set(CHARACTER_DEFS.map((d) => d.pal.glow));
    expect(bases.size).toBe(CHARACTER_DEFS.length);
    expect(glows.size).toBe(CHARACTER_DEFS.length);
    expect(characterDef("nope")).toBeNull();
    expect(hasBody("sql")).toBe(true);
  });

  it("names the five ranks and maps levels onto them", () => {
    const html = characterDef("html");
    expect(html && rankNames(html)).toEqual([
      "Каменный",
      "Пробуждённый",
      "Бронированный",
      "Мастер тегов",
      "Легендарный"
    ]);
    expect([0, 19, 20, 59, 60, 80, 100].map(rankIndex)).toEqual([
      0, 0, 1, 2, 3, 4, 4
    ]);
    expect(step(30, 20, 40)).toBe(0.5);
    expect(step(-5, 20, 40)).toBe(0);
  });
});

describe.each(CHARACTER_DEFS.map((d) => [d.slug, d] as const))(
  "%s figure",
  (_slug, def) => {
    it("starts grey, small and bare, with one dead eye", () => {
      const figure = buildFigure(def);
      const glow = figure.look(0);
      expect(glow).toMatchObject({ r2: 0, r3: 0, r4: 0, r5: 0 });
      expect(figure.parts.deadEye.visible).toBe(true);
      expect(figure.kit.grow.length).toBeGreaterThan(4);
      for (const [piece] of figure.kit.grow)
        expect(piece.scale.x).toBeLessThan(0.01);
      expect(figure.kit.m.stone.color.getHex()).toBe(0x55524f);
      figure.dispose();
    });

    it("grows into its own colour, armour, hover and wings at the top level", () => {
      const figure = buildFigure(def);
      const glow = figure.look(100);
      expect(glow).toMatchObject({ r2: 1, r3: 1, r4: 1, r5: 1 });
      expect(glow.hover).toBeGreaterThan(0.3);
      expect(figure.parts.deadEye.visible).toBe(false);
      for (const [piece] of figure.kit.grow) expect(piece.scale.x).toBe(1);
      expect(figure.kit.m.stone.color.getHex()).toBe(def.pal.base);
      figure.animate(2, 1, glow);
      expect(figure.root.position.y).toBeGreaterThan(0.2);
      expect(headTop(figure, glow.hover)).toBeGreaterThan(figure.parts.headY);
      figure.dispose();
    });

    it("keeps still with reduced motion", () => {
      const figure = buildFigure(def);
      const glow = figure.look(50);
      figure.animate(3, 0, glow);
      expect(figure.parts.head.rotation.y).toBe(0);
      expect(figure.root.position.y).toBeCloseTo(glow.hover);
    });
  }
);
