import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Redis, the fast memory: a compact quick-witted keeper built of stacked memory blocks, with a
 * cube-stack emblem on the chest, a key ring on the belt and a stopwatch hand; crimson.
 */
export const redis: CharacterDef = {
  slug: "redis",
  pal: {
    base: 0x8f2a2a,
    plate: 0x2b0b0b,
    trim: 0xffd1c7,
    glow: 0xff4438,
    aura: 0xffc9c2
  },
  ui: BODY_UI.redis,
  master: "Мастер памяти",
  stages: [
    "Худой кладовщик с пустыми полками на спине.",
    "На груди загорается стопка кубов, на поясе звенят ключи.",
    "Блоки памяти на плечах, секундомер на руке, связка ключей.",
    "Парит; вокруг GET, INCR, TTL и XADD, над головой сияет куб.",
    "Крылья из блоков памяти, всё горит алым."
  ],
  orbit: ["GET", "SET", "INCR", "TTL", "XADD", "ZADD"],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.27, 1.04, 0, body);
      K.box(0.28, 0.96, 0.3, K.m.stone, 0, -0.48, 0, leg);
      K.box(0.36, 0.14, 0.46, K.m.plate, 0, -0.96, 0.06, leg);
    }
    const torso = K.group(0, 1.64, 0, body);
    K.box(0.9, 0.82, 0.52, K.m.stone, 0, 0, 0, torso);
    // A stack of three tilted cubes on the chest.
    const rows: THREE.Object3D[] = [];
    for (let i = 0; i < 3; i++) {
      const cube = K.box(
        0.3,
        0.1,
        0.06,
        K.m.glow,
        0,
        0.18 - i * 0.14,
        0.27,
        torso
      );
      cube.rotation.z = i % 2 === 0 ? 0.12 : -0.12;
      rows.push(cube);
    }
    const core = K.box(0.08, 0.08, 0.04, K.m.trim, 0, -0.26, 0.28, torso);
    // Memory blocks on the shoulders.
    for (const side of [-1, 1])
      for (let k = 0; k < 2; k++)
        K.gear(
          K.box(
            0.26,
            0.12,
            0.3,
            k === 0 ? K.m.plate : K.m.glow,
            side * 0.56,
            0.44 + k * 0.14,
            0,
            torso
          ),
          42 + k * 4,
          52 + k * 4
        );
    // A key ring on the belt.
    K.gear(K.torus(0.1, 0.025, K.m.trim, 0.3, -0.42, 0.26, torso), 40, 50);
    const head = K.group(0, 2.36, 0, body);
    K.box(0.56, 0.5, 0.52, K.m.stone, 0, 0, 0, head);
    K.box(0.11, 0.08, 0.03, K.m.glow, -0.12, 0.04, 0.27, head);
    K.box(0.11, 0.08, 0.03, K.m.glow, 0.12, 0.04, 0.27, head);
    const deadEye = K.box(
      0.12,
      0.09,
      0.035,
      K.m.crack,
      -0.12,
      0.04,
      0.275,
      head
    );
    K.gear(K.box(0.5, 0.1, 0.46, K.m.plate, 0, 0.3, 0, head), 40, 50);
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.6, 1.98, 0, body);
      K.box(0.2, 0.76, 0.22, K.m.stone, 0, -0.38, 0, arm);
      K.box(0.24, 0.17, 0.24, K.m.stone, 0, -0.82, 0.02, arm);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // A stopwatch on the right wrist.
    K.gear(
      K.cyl(0.1, 0.1, 0.05, 14, K.m.trim, 0.13, -0.66, 0, armR),
      40,
      50
    ).rotation.z = Math.PI / 2;
    return { torso, head, armL, armR, deadEye, core, headY: 2.36, rows };
  },
  crest(K, g) {
    // A glowing cube outline.
    K.bar(0.3, 0, 0.15, 0, g);
    K.bar(0.3, 0, -0.15, 0, g);
    K.bar(0.3, -0.15, 0, Math.PI / 2, g);
    K.bar(0.3, 0.15, 0, Math.PI / 2, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of memory blocks: short thick bars in a staircase.
    for (let k = 0; k < 5; k++)
      K.bar(
        0.34,
        side * (0.45 + k * 0.17),
        0.38 - k * 0.14,
        0,
        p,
        undefined,
        0.14
      );
  }
};
