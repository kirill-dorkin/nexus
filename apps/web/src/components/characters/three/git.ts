import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Git: a living commit tree. Splayed roots for legs, a trunk for a body, branching arms that end
 * in glowing commit nodes and a round node head; bark brown and Git orange-red.
 */
export const git: CharacterDef = {
  slug: "git",
  pal: {
    base: 0x6b3a22,
    plate: 0x24140c,
    trim: 0xf05032,
    glow: 0xff6b4a,
    aura: 0xffb199
  },
  ui: BODY_UI.git,
  master: "Мастер истории",
  stages: [
    "Сухое деревце с одним погасшим узлом вместо головы.",
    "Узлы-коммиты на ветвях загораются, по стволу бежит линия истории.",
    "Кора-броня, кольца на ветвях, корни крепко держат землю.",
    "Парит; вокруг commit, merge, push и rebase, над головой знак развилки.",
    "Крылья из ветвей истории, каждый узел сияет."
  ],
  orbit: ["commit", "merge", "push", "pull", "rebase", "tag"],
  build(K: Kit, body: THREE.Group) {
    // Roots: four splayed blocks instead of legs.
    for (const [x, z, r] of [
      [-0.45, 0.25, 0.5],
      [0.45, 0.25, -0.5],
      [-0.35, -0.35, 2.4],
      [0.35, -0.35, -2.4]
    ] as const) {
      const root = K.box(0.36, 0.3, 1.1, K.m.stone, x, 0.16, z, body);
      root.rotation.y = r;
      K.gear(
        K.box(0.3, 0.06, 0.94, K.m.trim, x, 0.28, z, body),
        42,
        52
      ).rotation.y = r;
    }
    // The trunk.
    const torso = K.group(0, 1.25, 0, body);
    K.box(0.98, 1.5, 0.82, K.m.stone, 0, 0, 0, torso);
    K.box(1.12, 0.4, 0.94, K.m.stone, 0, -0.62, 0, torso);
    K.box(0.05, 1.3, 0.02, K.m.seam, 0, 0, 0.42, torso);
    const core = K.ico(0.2, K.m.glow, 0, 0.25, 0.44, torso, 0);
    for (let i = 0; i < 3; i++)
      K.gear(
        K.box(1.04, 0.08, 0.88, K.m.trim, 0, -0.4 + i * 0.45, 0, torso),
        40 + i * 2,
        50 + i * 2
      );
    // The head: a big commit node.
    const head = K.group(0, 2.55, 0, body);
    K.ico(0.62, K.m.stone, 0, 0, 0, head, 1);
    K.box(0.15, 0.15, 0.04, K.m.glow, -0.2, 0.08, 0.58, head);
    K.box(0.15, 0.15, 0.04, K.m.glow, 0.2, 0.08, 0.58, head);
    const deadEye = K.box(0.16, 0.16, 0.045, K.m.crack, -0.2, 0.08, 0.58, head);
    K.gear(
      K.torus(0.66, 0.06, K.m.trim, 0, 0, 0, head, 24),
      44,
      54
    ).rotation.x = Math.PI / 2;
    // Branching arms with commit nodes on the tips.
    const swayers: THREE.Object3D[] = [];
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.5, 1.8, 0, body);
      const limb = K.box(0.3, 1.15, 0.3, K.m.stone, side * 0.42, 0.26, 0, arm);
      limb.rotation.z = -side * 0.9;
      K.ico(0.26, K.m.glow, side * 0.92, 0.62, 0, arm, 0);
      const twig = K.group(side * 0.58, 0.4, 0, arm);
      K.box(0.18, 0.62, 0.18, K.m.stone, side * 0.1, 0.28, 0, twig).rotation.z =
        -side * 0.3;
      K.gear(K.ico(0.18, K.m.glow, side * 0.2, 0.64, 0, twig, 0), 40, 50);
      swayers.push(twig);
      K.gear(
        K.box(0.26, 0.08, 0.26, K.m.trim, side * 0.32, 0.2, 0, arm),
        42,
        52
      );
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    return { torso, head, armL, armR, deadEye, core, headY: 2.55, swayers };
  },
  crest(K, g) {
    // The branching sign: a trunk with a side branch and three nodes.
    K.bar(0.6, 0, 0, Math.PI / 2, g);
    K.bar(0.36, 0.14, 0.08, Math.PI / 4, g);
    K.ico(0.08, K.m.hot, 0, 0.32, 0, g, 0);
    K.ico(0.08, K.m.hot, 0, -0.32, 0, g, 0);
    K.ico(0.08, K.m.hot, 0.27, 0.21, 0, g, 0);
    return null;
  },
  wing(K, side, p) {
    // Branches of history fanning out, each with a node at the tip.
    for (let k = 0; k < 4; k++) {
      const len = 1.2 - k * 0.18;
      const angle = side * (0.65 - k * 0.2);
      K.bar(len, (side * len) / 2, 0.2 - k * 0.22, angle, p);
      K.ico(
        0.07,
        K.m.hot,
        side * len,
        0.2 - k * 0.22 + Math.sin(angle) * len * 0.5,
        0,
        p,
        0
      );
    }
  }
};
