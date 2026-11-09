import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * NestJS, the commander of modules: an armoured officer with a cat-like crested helmet, a chest
 * of interlocking module plates and a command baton; deep crimson with silver.
 */
export const nestjs: CharacterDef = {
  slug: "nestjs",
  pal: {
    base: 0x7a1f3a,
    plate: 0x240a14,
    trim: 0xe5e7eb,
    glow: 0xe0234e,
    aura: 0xfecdd8
  },
  ui: BODY_UI.nestjs,
  master: "Мастер командования",
  stages: [
    "Новобранец без доспехов, шлем без гребня.",
    "На груди сцепляются пластины модулей и загорается ядро.",
    "Гребень шлема, наплечники-модули и жезл командира.",
    "Парит; вокруг @Module, @Get, Guard и Pipe, над головой гребень сияет.",
    "Крылья из пластин модулей, весь доспех горит малиновым."
  ],
  orbit: ["@Module", "@Get", "Guard", "Pipe", "DTO", "@Injectable"],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.28, 1.12, 0, body);
      K.box(0.28, 1.04, 0.32, K.m.stone, 0, -0.52, 0, leg);
      K.gear(K.box(0.32, 0.26, 0.36, K.m.plate, 0, -0.5, 0.02, leg), 42, 52);
      K.box(0.36, 0.14, 0.48, K.m.plate, 0, -1.04, 0.06, leg);
    }
    const torso = K.group(0, 1.74, 0, body);
    K.box(0.94, 0.84, 0.54, K.m.stone, 0, 0, 0, torso);
    // Interlocking module plates: a 2x2 grid.
    const rows: THREE.Object3D[] = [];
    for (let r = 0; r < 2; r++)
      for (let col = 0; col < 2; col++)
        rows.push(
          K.box(
            0.22,
            0.2,
            0.04,
            K.m.glow,
            -0.13 + col * 0.26,
            0.14 - r * 0.24,
            0.28,
            torso
          )
        );
    const core = K.box(0.08, 0.08, 0.05, K.m.trim, 0.0, 0.02, 0.3, torso);
    for (const side of [-1, 1])
      K.gear(
        K.box(0.36, 0.16, 0.6, K.m.plate, side * 0.6, 0.42, 0, torso),
        42,
        52
      );
    const head = K.group(0, 2.46, 0, body);
    K.box(0.56, 0.54, 0.54, K.m.stone, 0, 0, 0, head);
    K.box(0.4, 0.07, 0.03, K.m.glow, 0, 0.06, 0.28, head);
    const deadEye = K.box(
      0.18,
      0.08,
      0.035,
      K.m.crack,
      -0.1,
      0.06,
      0.285,
      head
    );
    // The crested helmet with two ear points.
    K.gear(K.box(0.06, 0.24, 0.5, K.m.glow, 0, 0.38, -0.02, head), 44, 54);
    for (const side of [-1, 1])
      K.gear(
        K.cone(0.08, 0.2, 4, K.m.plate, side * 0.22, 0.34, 0, head),
        40,
        50
      );
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.62, 2.06, 0, body);
      K.box(0.2, 0.78, 0.22, K.m.stone, 0, -0.39, 0, arm);
      K.box(0.24, 0.18, 0.24, K.m.stone, 0, -0.84, 0.02, arm);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // The command baton.
    K.gear(K.cyl(0.04, 0.04, 0.56, 8, K.m.trim, 0, -1.08, 0.12, armR), 40, 50);
    K.gear(K.ico(0.06, K.m.glow, 0, -0.78, 0.12, armR, 0), 42, 52);
    return { torso, head, armL, armR, deadEye, core, headY: 2.46, rows };
  },
  crest(K, g) {
    // A crest: a chevron with a stroke.
    K.bar(0.3, -0.1, 0, 0.6, g);
    K.bar(0.3, 0.1, 0, -0.6, g);
    K.bar(0.2, 0, 0.14, Math.PI / 2, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of module plates: square-ish blocks in two rows.
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < 3; k++)
        K.bar(
          0.26,
          side * (0.45 + k * 0.3),
          0.26 - r * 0.32,
          0,
          p,
          undefined,
          0.2
        );
  }
};
