import type * as THREE from "three";
import { cracks, type Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/** JavaScript: spring legs, a thin arm and a gear arm, a big gear on the back, a lightning antenna; black and JS yellow. */
export const js: CharacterDef = {
  slug: "js",
  pal: {
    base: 0x3a3518,
    plate: 0x0f0f0f,
    trim: 0xf7df1e,
    glow: 0xf7df1e,
    aura: 0xfff59d
  },
  ui: BODY_UI.js,
  master: "Мастер событий",
  stages: [
    "Ржавый механизм, пружины сжаты, шестерня стоит.",
    "В трещинах бегают жёлтые искры, шестерня на спине крутится.",
    "Чёрно-жёлтые латы, рука-шестерня, поршни.",
    "Парит; вокруг =>, await, { }.",
    "Крылья из колец event loop, всё в молниях."
  ],
  orbit: ["=>", "{ }", "( )", "await", "[ ]", "fn"],
  build(K: Kit, body: THREE.Group) {
    const springs: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.3, 1.1, 0, body);
      K.box(0.24, 0.5, 0.28, K.m.stone, 0, -0.2, 0.08, leg).rotation.x = -0.4;
      const coil = K.group(0, -0.62, 0.12, leg);
      springs.push(coil);
      for (let i = 0; i < 4; i++)
        K.torus(0.12, 0.03, K.m.trim, 0, i * 0.08, 0, coil, 12).rotation.x =
          Math.PI / 2;
      K.box(0.2, 0.36, 0.22, K.m.stone, 0, -0.92, 0, leg);
      K.box(0.34, 0.1, 0.5, K.m.plate, 0, -1.08, 0.1, leg);
      K.gear(K.box(0.3, 0.3, 0.34, K.m.trim, 0, -0.9, 0.02, leg), 42, 52);
    }
    const torso = K.group(0, 1.65, 0, body);
    K.box(1.0, 0.8, 0.66, K.m.stone, 0, 0, 0, torso);
    cracks(K, torso, 0.335, 0.85);
    const core = K.torus(0.14, 0.05, K.m.glow, 0, 0.05, 0.36, torso, 8);
    for (let i = 0; i < 4; i++)
      K.gear(
        K.box(
          0.14,
          0.82,
          0.04,
          i % 2 ? K.m.trim : K.m.plate,
          -0.36 + i * 0.24,
          0,
          0.35,
          torso
        ),
        40 + i,
        50 + i
      );
    const backGear = K.torus(0.5, 0.12, K.m.plate, 0, 0.15, -0.42, torso, 10);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      K.box(
        0.12,
        0.16,
        0.12,
        K.m.plate,
        Math.cos(a) * 0.62,
        0.15 + Math.sin(a) * 0.62,
        -0.42,
        torso
      );
    }
    K.box(1.04, 0.03, 0.7, K.m.seam, 0, -0.2, 0, torso);
    K.box(0.03, 0.8, 0.7, K.m.seam, 0.3, 0, 0, torso);
    const head = K.group(0.05, 2.45, 0, body);
    K.box(0.7, 0.54, 0.62, K.m.stone, 0, 0, 0, head);
    K.box(0.6, 0.18, 0.06, K.m.plate, 0, 0.02, 0.32, head);
    K.box(0.12, 0.12, 0.04, K.m.glow, -0.14, 0.02, 0.36, head);
    K.box(0.2, 0.06, 0.04, K.m.glow, 0.14, 0.02, 0.36, head);
    const deadEye = K.box(
      0.12,
      0.12,
      0.045,
      K.m.crack,
      -0.14,
      0.02,
      0.36,
      head
    );
    const bolt = K.gear(K.group(0.22, 0.3, 0, head), 20, 30);
    for (const [x, y, r] of [
      [0, 0.12, 0.4],
      [0.06, 0.3, -0.5],
      [0, 0.48, 0.4]
    ] as const)
      K.box(0.06, 0.22, 0.06, K.m.trim, x, y, 0, bolt).rotation.z = r;
    const armL = K.group(-0.62, 1.95, 0, body);
    K.box(0.18, 0.8, 0.2, K.m.stone, 0, -0.4, 0, armL);
    K.box(0.24, 0.2, 0.24, K.m.plate, 0, -0.86, 0, armL);
    K.gear(K.box(0.34, 0.16, 0.34, K.m.trim, 0, 0.04, 0, armL), 40, 48);
    const armR = K.group(0.7, 1.95, 0, body);
    K.box(0.36, 0.6, 0.4, K.m.stone, 0, -0.3, 0, armR);
    const armGear = K.torus(0.24, 0.1, K.m.trim, 0, -0.78, 0, armR, 8);
    K.gear(K.box(0.56, 0.3, 0.56, K.m.plate, 0, 0.1, 0, armR), 40, 48);
    for (let i = 0; i < 2; i++)
      K.gear(
        K.cyl(0.05, 0.05, 0.6, 6, K.m.trim, -0.12 + i * 0.24, -0.3, 0.24, armR),
        44,
        54
      );
    return {
      torso,
      head,
      armL,
      armR,
      deadEye,
      core,
      headY: 2.45,
      spinners: [backGear, armGear],
      springs
    };
  },
  crest(K, g) {
    K.bar(0.4, -0.05, 0, 0, g);
    K.bar(0.2, 0.22, 0.06, -0.6, g);
    K.bar(0.2, 0.22, -0.06, 0.6, g);
    return null;
  },
  wing(K, side, p) {
    for (let k = 0; k < 3; k++)
      K.torus(
        0.45 - k * 0.08,
        0.04,
        K.m.hot,
        side * (0.5 + k * 0.45),
        -k * 0.15,
        -0.1,
        p,
        20
      ).rotation.y = side * 0.5;
  }
};
