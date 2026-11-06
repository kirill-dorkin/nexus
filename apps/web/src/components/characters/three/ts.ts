import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * TypeScript, the type guard: a broad armoured knight with a visored helm, a tower shield marked
 * TS in the left hand and a spear in the right; TypeScript blue.
 */
export const ts: CharacterDef = {
  slug: "ts",
  pal: {
    base: 0x1f4f8f,
    plate: 0x0c1a2e,
    trim: 0x8cc4ff,
    glow: 0x3178c6,
    aura: 0xb3d4ff
  },
  ui: BODY_UI.ts,
  master: "Мастер типов",
  stages: [
    "Пустые доспехи без щита, забрало опущено, в прорези темно.",
    "В прорези шлема загорается синий свет, на нагруднике — знак T.",
    "Наплечники, поножи и башенный щит с буквами TS.",
    "Парит; вокруг string, number, keyof и <T>, над шлемом гребень.",
    "Крылья из угловых скобок, копьё и щит светятся."
  ],
  orbit: ["string", "number", "<T>", "keyof", "never", "?."],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.34, 0.95, 0, body);
      K.box(0.38, 0.9, 0.42, K.m.stone, 0, -0.45, 0, leg);
      K.box(0.46, 0.16, 0.62, K.m.stone, 0, -0.88, 0.08, leg);
      K.gear(K.box(0.46, 0.5, 0.5, K.m.plate, 0, -0.5, 0.02, leg), 42, 52);
      K.gear(K.box(0.5, 0.08, 0.54, K.m.trim, 0, -0.24, 0.02, leg), 44, 54);
    }
    const torso = K.group(0, 1.6, 0, body);
    K.box(1.4, 0.95, 0.8, K.m.stone, 0, 0, 0, torso);
    K.box(1.1, 0.3, 0.7, K.m.stone, 0, -0.6, 0, torso);
    // A glowing T on the breastplate.
    const core = K.box(0.4, 0.08, 0.04, K.m.glow, 0, 0.2, 0.42, torso);
    K.box(0.08, 0.4, 0.04, K.m.glow, 0, 0, 0.42, torso);
    K.gear(K.box(1.24, 0.7, 0.1, K.m.plate, 0, 0.05, 0.42, torso), 40, 50);
    K.gear(K.box(1.46, 0.08, 0.86, K.m.trim, 0, -0.42, 0, torso), 42, 52);
    // A visored helm.
    const head = K.group(0, 2.45, 0, body);
    K.box(0.8, 0.8, 0.8, K.m.stone, 0, 0, 0, head);
    K.box(0.84, 0.1, 0.84, K.m.trim, 0, 0.42, 0, head);
    K.box(0.6, 0.08, 0.04, K.m.glow, 0, 0.04, 0.41, head);
    K.box(0.06, 0.34, 0.04, K.m.plate, 0, -0.18, 0.41, head);
    const deadEye = K.box(0.6, 0.08, 0.045, K.m.crack, 0, 0.04, 0.415, head);
    K.gear(K.box(0.9, 0.3, 0.9, K.m.plate, 0, 0.28, 0, head), 44, 54);
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.92, 1.95, 0, body);
      K.box(0.34, 0.8, 0.38, K.m.stone, 0, -0.4, 0, arm);
      K.box(0.4, 0.3, 0.42, K.m.stone, 0, -0.9, 0.02, arm);
      K.gear(K.box(0.62, 0.3, 0.62, K.m.plate, 0, 0.06, 0, arm), 40, 48);
      K.gear(K.box(0.66, 0.06, 0.66, K.m.trim, 0, 0.22, 0, arm), 42, 50);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // Tower shield with «TS» in the left hand.
    const shield = K.group(-0.2, -0.8, 0.36, armL);
    K.gear(K.box(0.9, 1.3, 0.08, K.m.plate, 0, 0, 0, shield), 42, 52);
    K.gear(K.box(0.94, 0.06, 0.1, K.m.trim, 0, 0.62, 0, shield), 44, 54);
    K.gear(
      K.box(0.22, 0.05, 0.03, K.m.glow, -0.16, 0.18, 0.06, shield),
      46,
      56
    );
    K.gear(K.box(0.05, 0.3, 0.03, K.m.glow, -0.16, 0.03, 0.06, shield), 46, 56);
    K.gear(K.box(0.2, 0.05, 0.03, K.m.glow, 0.17, 0.18, 0.06, shield), 46, 56);
    K.gear(K.box(0.2, 0.05, 0.03, K.m.glow, 0.17, 0.03, 0.06, shield), 46, 56);
    K.gear(K.box(0.2, 0.05, 0.03, K.m.glow, 0.17, -0.12, 0.06, shield), 46, 56);
    // A spear in the right hand.
    const spear = K.group(0.05, -0.9, 0.2, armR);
    K.gear(K.box(0.07, 2.6, 0.07, K.m.plate, 0, 0.4, 0, spear), 46, 56);
    K.gear(K.cone(0.12, 0.36, 4, K.m.glow, 0, 1.86, 0, spear), 48, 58);
    return { torso, head, armL, armR, deadEye, core, headY: 2.45 };
  },
  crest(K, g) {
    // A plume of three blades.
    K.bar(0.5, 0, 0, Math.PI / 2, g);
    K.bar(0.36, -0.14, -0.05, Math.PI / 2 + 0.4, g);
    K.bar(0.36, 0.14, -0.05, Math.PI / 2 - 0.4, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of angle brackets: < > chevrons stacked outward.
    for (let k = 0; k < 4; k++) {
      const x = side * (0.3 + k * 0.32);
      const y = 0.1 - k * 0.12;
      K.bar(0.5 - k * 0.05, x, y + 0.12, side * 0.6, p);
      K.bar(0.5 - k * 0.05, x, y - 0.12, -side * 0.6, p);
    }
  }
};
