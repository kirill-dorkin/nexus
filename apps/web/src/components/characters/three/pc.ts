import type * as THREE from "three";
import type { Kit } from "./kit";
import type { CharacterDef } from "./types";

/** ПК: tank treads, a tower torso, a monitor head and claw arms; steel and cyan neon. */
export const pc: CharacterDef = {
  slug: "pc",
  pal: {
    base: 0x3f5f86,
    plate: 0x1b2633,
    trim: 0xa9bccf,
    glow: 0x38e1ff,
    aura: 0x8ff3ff
  },
  ui: ["#38e1ff", "#a5f3fc", "#0e7490", "#083344"],
  master: "Мастер железа",
  stages: [
    "Пыльный системник на гусеницах, экран еле светится.",
    "Экран-лицо оживает голубым, мигает питание.",
    "Броня-панели, радиаторы, клешни в латах.",
    "Парит; вокруг CPU, RAM, SSD; над головой вентилятор.",
    "Крылья из шлейфов, из вентиляции бьёт свет."
  ],
  orbit: ["CPU", "RAM", "SSD", "GPU", "USB", "OS"],
  build(K: Kit, body: THREE.Group) {
    const wheels: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const tread = K.group(side * 0.55, 0.3, 0, body);
      K.box(0.42, 0.5, 1.5, K.m.plate, 0, 0, 0, tread);
      for (let i = 0; i < 4; i++) {
        const w = K.cyl(
          0.2,
          0.2,
          0.46,
          10,
          K.m.stone,
          0,
          -0.02,
          -0.54 + i * 0.36,
          tread
        );
        w.rotation.z = Math.PI / 2;
        wheels.push(w);
      }
      K.gear(K.box(0.48, 0.12, 1.56, K.m.trim, 0, 0.28, 0, tread), 42, 52);
    }
    const torso = K.group(0, 1.35, 0, body);
    K.box(1.3, 1.1, 0.95, K.m.stone, 0, 0, 0, torso);
    for (let i = 0; i < 3; i++)
      K.box(0.66, 0.1, 0.04, K.m.plate, -0.2, 0.3 - i * 0.15, 0.49, torso);
    for (let i = 0; i < 4; i++)
      K.box(0.5, 0.03, 0.02, K.m.crack, -0.2, -0.18 - i * 0.08, 0.485, torso);
    const core = K.box(0.12, 0.12, 0.04, K.m.glow, 0.42, 0.34, 0.49, torso);
    K.gear(K.box(0.06, 1.0, 0.98, K.m.trim, -0.68, 0, 0, torso), 40, 48);
    K.gear(K.box(0.06, 1.0, 0.98, K.m.trim, 0.68, 0, 0, torso), 40, 48);
    K.box(1.34, 0.03, 0.99, K.m.seam, 0, 0.12, 0, torso);
    K.box(1.34, 0.03, 0.99, K.m.seam, 0, -0.3, 0, torso);
    const head = K.group(0, 2.35, 0, body);
    K.box(0.22, 0.24, 0.22, K.m.plate, 0, -0.44, 0, head);
    K.box(1.25, 0.82, 0.22, K.m.stone, 0, 0, 0, head);
    K.box(1.06, 0.66, 0.04, K.m.plate, 0, 0, 0.12, head);
    K.box(0.18, 0.18, 0.03, K.m.glow, -0.22, 0.06, 0.145, head);
    K.box(0.18, 0.18, 0.03, K.m.glow, 0.22, 0.06, 0.145, head);
    K.box(0.4, 0.05, 0.03, K.m.glow, 0, -0.17, 0.145, head);
    const deadEye = K.box(
      0.18,
      0.18,
      0.035,
      K.m.crack,
      -0.22,
      0.06,
      0.145,
      head
    );
    for (let i = 0; i < 5; i++) {
      const cable = K.box(
        0.05,
        0.55,
        0.05,
        K.m.trim,
        -0.4 + i * 0.2,
        0.6,
        -0.08,
        head
      );
      cable.rotation.x = -0.45;
      K.gear(cable, 46, 56);
    }
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.82, 1.7, 0, body);
      K.box(0.24, 0.6, 0.24, K.m.plate, 0, -0.3, 0, arm);
      K.box(0.34, 0.2, 0.34, K.m.stone, 0, -0.66, 0, arm);
      K.box(0.06, 0.3, 0.12, K.m.trim, -0.1, -0.88, 0.05, arm).rotation.z = 0.3;
      K.box(0.06, 0.3, 0.12, K.m.trim, 0.1, -0.88, 0.05, arm).rotation.z = -0.3;
      for (let i = 0; i < 4; i++)
        K.gear(
          K.box(0.04, 0.24, 0.5, K.m.trim, -0.15 + i * 0.1, 0.12, 0, arm),
          44 + i,
          54 + i
        );
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    K.gear(
      K.box(0.72, 0.06, 0.32, K.m.trim, 0, -0.6, 0.3, armL),
      44,
      54
    ).rotation.x = 1.2;
    return { torso, head, armL, armR, deadEye, core, headY: 2.35, wheels };
  },
  crest(K, g) {
    K.torus(0.42, 0.04, K.m.hot, 0, 0, 0, g, 32);
    const blades = K.group(0, 0, 0, g);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      K.box(
        0.32,
        0.1,
        0.03,
        K.m.hot,
        Math.cos(a) * 0.18,
        Math.sin(a) * 0.18,
        0,
        blades
      ).rotation.z = a;
    }
    return blades;
  },
  wing(K, side, p) {
    for (let k = 0; k < 5; k++) {
      const f = K.group(side * (0.2 + k * 0.22), 0.1 - k * 0.14, -k * 0.04, p);
      K.bar(
        1.1 - k * 0.12,
        side * (0.55 - k * 0.06),
        0,
        side * (0.6 - k * 0.1),
        f,
        K.m.hot,
        0.1
      );
    }
  }
};
