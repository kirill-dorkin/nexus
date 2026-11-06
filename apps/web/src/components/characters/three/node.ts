import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Node.js, the engine: a stocky machine on two drive wheels with a boiler chest, a hexagonal
 * gauge head, piston arms and an exhaust stack; Node green.
 */
export const node: CharacterDef = {
  slug: "node",
  pal: {
    base: 0x2f5d2a,
    plate: 0x10200e,
    trim: 0x8fd16a,
    glow: 0x5fa04e,
    aura: 0xc7f2a8
  },
  ui: BODY_UI.node,
  master: "Мастер потоков",
  stages: [
    "Остывший котёл на двух колёсах, стрелка манометра на нуле.",
    "Котёл разогревается зелёным, колёса начинают вращаться.",
    "Поршни на руках, клёпаная броня и труба с паром.",
    "Парит; вокруг npm, async, fs и http, над головой шестигранник.",
    "Крылья из шестерёнок, из трубы бьёт зелёный пар."
  ],
  orbit: ["npm", "async", "fs", "http", "await", "pipe"],
  build(K: Kit, body: THREE.Group) {
    // Two big drive wheels instead of legs.
    const wheels: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const w = K.cyl(
        0.55,
        0.55,
        0.3,
        12,
        K.m.stone,
        side * 0.62,
        0.55,
        0,
        body
      );
      w.rotation.z = Math.PI / 2;
      wheels.push(w);
      K.gear(
        K.torus(0.55, 0.06, K.m.trim, side * 0.79, 0.55, 0, body, 20),
        42,
        52
      ).rotation.y = Math.PI / 2;
    }
    // The boiler chest.
    const torso = K.group(0, 1.55, 0, body);
    const boiler = K.cyl(0.62, 0.62, 1.1, 12, K.m.stone, 0, 0, 0, torso);
    boiler.rotation.x = Math.PI / 2;
    const core = K.box(0.3, 0.3, 0.06, K.m.glow, 0, 0.05, 0.58, torso);
    K.gear(K.box(1.3, 0.1, 1.2, K.m.trim, 0, -0.5, 0, torso), 40, 50);
    for (let i = 0; i < 3; i++)
      K.gear(
        K.torus(0.63, 0.04, K.m.plate, 0, 0, -0.35 + i * 0.35, torso, 20),
        42 + i,
        52 + i
      );
    // A hexagonal gauge head.
    const head = K.group(0, 2.42, 0, body);
    K.cyl(0.42, 0.42, 0.5, 6, K.m.stone, 0, 0, 0, head).rotation.x =
      Math.PI / 2;
    K.cyl(0.3, 0.3, 0.04, 6, K.m.plate, 0, 0, 0.26, head).rotation.x =
      Math.PI / 2;
    K.box(0.12, 0.12, 0.03, K.m.glow, -0.12, 0.06, 0.29, head);
    K.box(0.12, 0.12, 0.03, K.m.glow, 0.12, 0.06, 0.29, head);
    const deadEye = K.box(
      0.13,
      0.13,
      0.035,
      K.m.crack,
      -0.12,
      0.06,
      0.295,
      head
    );
    // The exhaust stack on the back.
    K.gear(
      K.cyl(0.13, 0.17, 0.8, 8, K.m.plate, 0.32, 2.2, -0.45, body),
      44,
      54
    );
    // Piston arms.
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.82, 1.85, 0, body);
      K.box(0.26, 0.7, 0.26, K.m.stone, 0, -0.35, 0, arm);
      K.cyl(0.18, 0.18, 0.3, 10, K.m.stone, 0, -0.8, 0.02, arm);
      K.gear(
        K.box(0.12, 0.5, 0.12, K.m.trim, side * 0.18, -0.4, 0.12, arm),
        42,
        52
      );
      K.gear(K.box(0.36, 0.2, 0.36, K.m.plate, 0, 0.05, 0, arm), 40, 48);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    return { torso, head, armL, armR, deadEye, core, headY: 2.42, wheels };
  },
  crest(K, g) {
    // A hexagon outline.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      K.bar(0.3, Math.cos(a) * 0.26, Math.sin(a) * 0.26, a + Math.PI / 2, g);
    }
    return null;
  },
  wing(K, side, p) {
    // Gear wings: rings of decreasing size.
    for (let k = 0; k < 3; k++) {
      const r = 0.42 - k * 0.1;
      K.torus(
        r,
        0.04,
        K.m.hot,
        side * (0.5 + k * 0.62),
        0.1 - k * 0.12,
        0,
        p,
        16
      );
    }
  }
};
