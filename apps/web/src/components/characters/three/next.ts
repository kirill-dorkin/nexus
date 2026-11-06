import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Next.js, the React architect: a tall slender figure built like a tower in black and white, a
 * triangular "N" visor, a blueprint scroll in one hand and a set square in the other; monochrome
 * with a cold white glow.
 */
export const next: CharacterDef = {
  slug: "next",
  pal: {
    base: 0x2a2a30,
    plate: 0x0a0a0c,
    trim: 0xe5e7eb,
    glow: 0xf5f5f5,
    aura: 0xffffff
  },
  ui: BODY_UI.next,
  master: "Мастер архитектуры",
  stages: [
    "Подмастерье с пустыми руками, башня на спине — лишь каркас.",
    "Каркас обрастает этажами, на груди загорается знак N.",
    "Свиток чертежей и угольник в руках, наплечники-перекрытия.",
    "Парит; вокруг page, layout, use client и ƒ, над головой шпиль.",
    "Крылья из этажей башни, всё сияет белым."
  ],
  orbit: ["page", "layout", "use client", "RSC", "ƒ", "○"],
  build(K: Kit, body: THREE.Group) {
    // Tall straight legs like columns.
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.24, 1.2, 0, body);
      K.box(0.24, 1.14, 0.26, K.m.stone, 0, -0.57, 0, leg);
      K.box(0.32, 0.12, 0.4, K.m.plate, 0, -1.14, 0.04, leg);
    }
    const torso = K.group(0, 1.8, 0, body);
    K.box(0.8, 0.86, 0.46, K.m.stone, 0, 0, 0, torso);
    // Floors of the tower across the chest.
    const rows: THREE.Object3D[] = [];
    for (let i = 0; i < 3; i++)
      rows.push(
        K.gear(
          K.box(0.6, 0.05, 0.03, K.m.glow, 0, 0.26 - i * 0.18, 0.24, torso),
          40 + i * 2,
          50 + i * 2
        )
      );
    // The N mark: two posts and a diagonal.
    const core = K.box(0.06, 0.3, 0.035, K.m.glow, -0.1, -0.24, 0.25, torso);
    K.box(0.06, 0.3, 0.035, K.m.glow, 0.1, -0.24, 0.25, torso);
    K.box(0.05, 0.34, 0.035, K.m.glow, 0, -0.24, 0.25, torso).rotation.z = 0.6;
    for (const side of [-1, 1])
      K.gear(
        K.box(0.3, 0.1, 0.5, K.m.plate, side * 0.5, 0.42, 0, torso),
        42,
        52
      );
    // The head: a narrow block with a visor and a spire.
    const head = K.group(0, 2.52, 0, body);
    K.box(0.5, 0.56, 0.5, K.m.stone, 0, 0, 0, head);
    K.box(0.11, 0.07, 0.03, K.m.glow, -0.11, 0.04, 0.26, head);
    K.box(0.11, 0.07, 0.03, K.m.glow, 0.11, 0.04, 0.26, head);
    const deadEye = K.box(
      0.12,
      0.08,
      0.035,
      K.m.crack,
      -0.11,
      0.04,
      0.265,
      head
    );
    K.gear(K.cone(0.12, 0.5, 4, K.m.trim, 0, 0.52, 0, head), 44, 54);
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.52, 2.12, 0, body);
      K.box(0.16, 0.82, 0.18, K.m.stone, 0, -0.41, 0, arm);
      K.box(0.2, 0.16, 0.2, K.m.stone, 0, -0.88, 0.02, arm);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // A blueprint scroll and a set square.
    K.gear(
      K.cyl(0.07, 0.07, 0.6, 8, K.m.trim, 0, -0.96, 0.14, armL),
      40,
      50
    ).rotation.x = Math.PI / 2;
    K.gear(K.box(0.04, 0.4, 0.3, K.m.glow, 0, -1.02, 0.12, armR), 42, 52);
    return { torso, head, armL, armR, deadEye, core, headY: 2.52, rows };
  },
  crest(K, g) {
    // A tower spire: a tall mast with two crossbars.
    K.bar(0.46, 0, 0.06, Math.PI / 2, g);
    K.bar(0.26, 0, 0.0, 0, g);
    K.bar(0.16, 0, 0.16, 0, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of tower floors: horizontal slabs stepping out.
    for (let k = 0; k < 5; k++)
      K.bar(0.9 - k * 0.12, side * (0.5 + k * 0.06), 0.4 - k * 0.2, 0, p);
  }
};
