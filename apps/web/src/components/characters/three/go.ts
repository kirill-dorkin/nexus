import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Go, the runner: a light sprinter leaning forward with long legs, speed fins on the calves, a
 * round goggle visor and a relay baton in hand; cyan with white trim.
 */
export const go: CharacterDef = {
  slug: "go",
  pal: {
    base: 0x0f6f86,
    plate: 0x062a33,
    trim: 0xe0fbff,
    glow: 0x00add8,
    aura: 0xb8f1ff
  },
  ui: BODY_UI.go,
  master: "Мастер скорости",
  stages: [
    "Худой новичок в стартовой позе, кроссовки без шипов.",
    "Выпрямляется, на груди загорается полоса скорости, очки на глазах.",
    "Плавники скорости на икрах, эстафетная палочка и наплечники.",
    "Парит; вокруг go, chan, defer и :=, над головой секундомер.",
    "Крылья из линий скорости, весь бегун горит голубым."
  ],
  orbit: ["go", "chan", "defer", ":=", "err", "select"],
  build(K: Kit, body: THREE.Group) {
    // Long sprinter legs with speed fins.
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.24, 1.25, 0, body);
      K.box(0.22, 1.16, 0.26, K.m.stone, 0, -0.58, 0, leg);
      K.box(0.3, 0.12, 0.5, K.m.plate, 0, -1.18, 0.1, leg);
      K.gear(
        K.box(0.04, 0.4, 0.3, K.m.glow, side * 0.13, -0.7, -0.14, leg),
        42,
        52
      );
    }
    const torso = K.group(0, 1.82, 0, body);
    torso.rotation.x = 0.08;
    K.box(0.82, 0.76, 0.46, K.m.stone, 0, 0, 0, torso);
    // Speed stripes across the chest.
    const rows: THREE.Object3D[] = [];
    for (let i = 0; i < 3; i++)
      rows.push(
        K.box(
          0.5 - i * 0.12,
          0.05,
          0.03,
          K.m.glow,
          0.08 - i * 0.04,
          0.16 - i * 0.12,
          0.24,
          torso
        )
      );
    const core = K.box(0.14, 0.14, 0.04, K.m.trim, -0.22, -0.18, 0.24, torso);
    for (const side of [-1, 1])
      K.gear(
        K.box(0.28, 0.12, 0.48, K.m.plate, side * 0.48, 0.36, 0, torso),
        42,
        52
      );
    // The head: round goggles.
    const head = K.group(0, 2.5, 0.04, body);
    K.box(0.56, 0.52, 0.52, K.m.stone, 0, 0, 0, head);
    for (const side of [-1, 1])
      K.gear(
        K.torus(0.1, 0.03, K.m.trim, side * 0.13, 0.05, 0.27, head),
        40,
        50
      );
    K.box(0.1, 0.08, 0.03, K.m.glow, -0.13, 0.05, 0.28, head);
    K.box(0.1, 0.08, 0.03, K.m.glow, 0.13, 0.05, 0.28, head);
    const deadEye = K.box(
      0.11,
      0.09,
      0.035,
      K.m.crack,
      -0.13,
      0.05,
      0.285,
      head
    );
    K.gear(K.box(0.62, 0.06, 0.58, K.m.glow, 0, 0.2, 0, head), 44, 54);
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.52, 2.08, 0, body);
      K.box(0.17, 0.74, 0.19, K.m.stone, 0, -0.37, 0, arm);
      K.box(0.21, 0.16, 0.21, K.m.stone, 0, -0.8, 0.02, arm);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // The relay baton.
    K.gear(
      K.cyl(0.05, 0.05, 0.42, 8, K.m.glow, 0, -0.92, 0.12, armR),
      40,
      50
    ).rotation.x = Math.PI / 2;
    return { torso, head, armL, armR, deadEye, core, headY: 2.5, rows };
  },
  crest(K, g) {
    // A stopwatch: a ring with a hand.
    K.torus(0.18, 0.04, K.m.hot, 0, 0, 0, g);
    K.bar(0.14, 0.04, 0.04, 0.8, g);
    K.bar(0.1, 0, 0.24, Math.PI / 2, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of speed lines streaming back.
    for (let k = 0; k < 5; k++)
      K.bar(
        1.1 - k * 0.14,
        side * (0.55 + k * 0.05),
        0.36 - k * 0.18,
        side * 0.12,
        p
      );
  }
};
