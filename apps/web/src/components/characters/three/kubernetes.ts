import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Kubernetes, the fleet captain: a tall captain in a long coat with a ship's helm on the chest
 * (seven spokes), a captain's cap and a spyglass; deep blue with white trim.
 */
export const kubernetes: CharacterDef = {
  slug: "kubernetes",
  pal: {
    base: 0x2a4f9e,
    plate: 0x0f1d3d,
    trim: 0xeef2ff,
    glow: 0x5b8def,
    aura: 0xc7d7fe
  },
  ui: BODY_UI.kubernetes,
  master: "Мастер флота",
  stages: [
    "Юнга без фуражки, штурвал на груди едва виден.",
    "Штурвал загорается, на голове появляется фуражка.",
    "Длинный китель с наплечниками, подзорная труба в руке.",
    "Парит; вокруг Pod, Service, HPA и Helm, над головой сияет штурвал.",
    "Крылья из парусов, весь флот горит синим."
  ],
  orbit: ["Pod", "Service", "HPA", "Helm", "kubectl", "RBAC"],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.26, 1.14, 0, body);
      K.box(0.26, 1.06, 0.3, K.m.stone, 0, -0.53, 0, leg);
      K.box(0.34, 0.14, 0.48, K.m.plate, 0, -1.06, 0.06, leg);
    }
    // The long coat skirt.
    K.cyl(0.42, 0.56, 0.6, 8, K.m.stone, 0, 1.22, 0, body);
    const torso = K.group(0, 1.78, 0, body);
    K.box(0.9, 0.8, 0.52, K.m.stone, 0, 0, 0, torso);
    // The ship's helm: a ring with seven spokes.
    K.gear(K.torus(0.2, 0.035, K.m.trim, 0, 0.02, 0.28, torso), 40, 50);
    const rows: THREE.Object3D[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const spoke = K.box(
        0.03,
        0.18,
        0.03,
        K.m.glow,
        Math.sin(a) * 0.1,
        0.02 + Math.cos(a) * 0.1,
        0.29,
        torso
      );
      spoke.rotation.z = -a;
      rows.push(spoke);
    }
    const core = K.cyl(0.06, 0.06, 0.04, 12, K.m.glow, 0, 0.02, 0.29, torso);
    core.rotation.x = Math.PI / 2;
    for (const side of [-1, 1])
      K.gear(
        K.box(0.32, 0.1, 0.54, K.m.trim, side * 0.52, 0.4, 0, torso),
        42,
        52
      );
    const head = K.group(0, 2.48, 0, body);
    K.box(0.56, 0.52, 0.52, K.m.stone, 0, 0, 0, head);
    K.box(0.11, 0.08, 0.03, K.m.glow, -0.12, 0.02, 0.27, head);
    K.box(0.11, 0.08, 0.03, K.m.glow, 0.12, 0.02, 0.27, head);
    const deadEye = K.box(
      0.12,
      0.09,
      0.035,
      K.m.crack,
      -0.12,
      0.02,
      0.275,
      head
    );
    // A captain's cap with a visor.
    K.gear(K.cyl(0.34, 0.32, 0.16, 12, K.m.plate, 0, 0.34, 0, head), 40, 50);
    K.gear(K.box(0.4, 0.04, 0.18, K.m.plate, 0, 0.28, 0.3, head), 40, 50);
    K.gear(K.box(0.12, 0.08, 0.02, K.m.glow, 0, 0.36, 0.33, head), 42, 52);
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.58, 2.1, 0, body);
      K.box(0.19, 0.8, 0.22, K.m.stone, 0, -0.4, 0, arm);
      K.box(0.23, 0.17, 0.23, K.m.stone, 0, -0.86, 0.02, arm);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // The spyglass.
    K.gear(
      K.cyl(0.05, 0.07, 0.5, 8, K.m.trim, 0, -0.96, 0.18, armL),
      44,
      54
    ).rotation.x = Math.PI / 2;
    return { torso, head, armL, armR, deadEye, core, headY: 2.48, rows };
  },
  crest(K, g) {
    // A helm: a ring with crossed spokes.
    K.torus(0.2, 0.04, K.m.hot, 0, 0, 0, g);
    K.bar(0.5, 0, 0, Math.PI / 2, g);
    K.bar(0.5, 0, 0, Math.PI / 6, g);
    K.bar(0.5, 0, 0, -Math.PI / 6, g);
    return null;
  },
  wing(K, side, p) {
    // Sail wings: tall triangles made of bars.
    for (let k = 0; k < 4; k++)
      K.bar(
        1.0 - k * 0.2,
        side * (0.45 + k * 0.16),
        0.3 - k * 0.2,
        side * (1.2 - k * 0.15),
        p
      );
  }
};
