import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Vue, the master of reactivity: a gardener-alchemist with a V-shaped chest plate, a sprouting
 * leaf crown and a watering flask that feeds the interface; emerald with dark slate.
 */
export const vue: CharacterDef = {
  slug: "vue",
  pal: {
    base: 0x2e6b55,
    plate: 0x1a2b36,
    trim: 0xb8f5d8,
    glow: 0x42b883,
    aura: 0xd1fae5
  },
  ui: BODY_UI.vue,
  master: "Мастер реактивности",
  stages: [
    "Робкий садовник с пустой лейкой, на голове — голый росток.",
    "На груди загорается знак V, росток выпускает первые листья.",
    "Колба-лейка, наплечники-листья и венок на голове.",
    "Парит; вокруг ref, computed, v-model и Pinia, над головой распустившийся цветок.",
    "Крылья из листьев, весь сад горит изумрудом."
  ],
  orbit: ["ref", "computed", "v-model", "watch", "Pinia", "<slot>"],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.26, 1.12, 0, body);
      K.box(0.26, 1.04, 0.28, K.m.stone, 0, -0.52, 0, leg);
      K.box(0.34, 0.12, 0.46, K.m.plate, 0, -1.04, 0.06, leg);
    }
    const torso = K.group(0, 1.72, 0, body);
    K.box(0.88, 0.8, 0.5, K.m.stone, 0, 0, 0, torso);
    // The V mark: two tilted bars, a dark inner V over a bright outer one.
    const core = K.box(0.1, 0.46, 0.04, K.m.glow, -0.12, 0.02, 0.26, torso);
    core.rotation.z = 0.42;
    K.box(0.1, 0.46, 0.04, K.m.glow, 0.12, 0.02, 0.26, torso).rotation.z =
      -0.42;
    const rows: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const inner = K.box(
        0.05,
        0.26,
        0.03,
        K.m.plate,
        side * 0.06,
        0.08,
        0.29,
        torso
      );
      inner.rotation.z = -side * 0.42;
      rows.push(inner);
    }
    // Leaf shoulder plates.
    for (const side of [-1, 1])
      K.gear(
        K.cone(0.2, 0.5, 4, K.m.glow, side * 0.5, 0.42, 0, torso),
        42,
        52
      ).rotation.z = -side * 1.2;
    const head = K.group(0, 2.44, 0, body);
    K.box(0.56, 0.52, 0.52, K.m.stone, 0, 0, 0, head);
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
    // A sprout with leaves on the head.
    K.box(0.04, 0.24, 0.04, K.m.trim, 0, 0.38, 0, head);
    for (const side of [-1, 1])
      K.gear(
        K.cone(0.08, 0.22, 4, K.m.glow, side * 0.1, 0.46, 0, head),
        40,
        50
      ).rotation.z = -side * 1.0;
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.56, 2.04, 0, body);
      K.box(0.18, 0.76, 0.2, K.m.stone, 0, -0.38, 0, arm);
      K.box(0.22, 0.16, 0.22, K.m.stone, 0, -0.82, 0.02, arm);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // The watering flask in the right hand.
    K.gear(K.ico(0.14, K.m.glow, 0, -1.0, 0.14, armR, 1), 42, 52);
    K.gear(
      K.cyl(0.03, 0.04, 0.2, 6, K.m.trim, 0.1, -0.9, 0.16, armR),
      42,
      52
    ).rotation.z = -0.8;
    return { torso, head, armL, armR, deadEye, core, headY: 2.44, rows };
  },
  crest(K, g) {
    // A blooming V: two petals and a stem.
    K.bar(0.34, -0.11, 0.06, 1.15, g);
    K.bar(0.34, 0.11, 0.06, -1.15, g);
    K.bar(0.18, 0, -0.14, Math.PI / 2, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of leaves: tilted blades fanning out.
    for (let k = 0; k < 5; k++)
      K.bar(
        0.8 - k * 0.08,
        side * (0.45 + k * 0.12),
        0.34 - k * 0.16,
        side * (0.7 - k * 0.3),
        p,
        undefined,
        0.11
      );
  }
};
