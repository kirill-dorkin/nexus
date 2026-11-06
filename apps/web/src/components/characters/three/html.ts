import type * as THREE from "three";
import { cracks, type Kit } from "./kit";
import type { CharacterDef } from "./types";

/** HTML: the block builder with helmet and spiked pauldrons; brick fire, the HTML5 orange. */
export const html: CharacterDef = {
  slug: "html",
  pal: {
    base: 0x9a3a1c,
    plate: 0x2a1a14,
    trim: 0xe34f26,
    glow: 0xff6a21,
    aura: 0xffa15c
  },
  ui: ["#f26a21", "#ffa15c", "#d9441c", "#3a1208"],
  master: "Мастер тегов",
  stages: [
    "Маленький и сутулый, в трещинах. Горит один глаз.",
    "Трещины раскаляются оранжевым, загораются глаза и ядро.",
    "Наплечники с шипами, нагрудник, латы и гребень.",
    "Парит; вокруг теги, над головой </>.",
    "Крылья из скобок, голова в огне, тело раскалено."
  ],
  orbit: ["<div>", "<p>", "<a>", "<img>", "<ul>", "<h1>"],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.32, 0.9, 0, body);
      K.box(0.36, 0.8, 0.42, K.m.stone, 0, -0.42, 0, leg);
      K.box(0.46, 0.16, 0.6, K.m.stone, 0, -0.82, 0.06, leg);
      K.gear(K.box(0.5, 0.42, 0.52, K.m.plate, 0, -0.52, 0.02, leg), 42, 52);
      K.gear(K.box(0.54, 0.1, 0.66, K.m.trim, 0, -0.72, 0.06, leg), 44, 54);
    }
    const torso = K.group(0, 1.55, 0, body);
    K.box(1.3, 0.5, 0.78, K.m.stone, 0, -0.42, 0, torso);
    K.box(1.46, 0.62, 0.86, K.m.stone, 0, 0.14, 0, torso);
    K.box(1.0, 0.18, 0.7, K.m.stone, 0, 0.53, 0, torso);
    cracks(K, torso, 0.435);
    const core = K.ico(0.17, K.m.glow, 0, 0.12, 0.5, torso, 0);
    K.gear(K.box(1.12, 0.46, 0.1, K.m.plate, 0, 0.12, 0.47, torso), 40, 50);
    K.gear(K.box(1.2, 0.08, 0.12, K.m.trim, 0, 0.38, 0.48, torso), 42, 52);
    K.gear(K.box(1.36, 0.14, 0.9, K.m.trim, 0, -0.17, 0, torso), 44, 54);
    K.box(1.5, 0.03, 0.9, K.m.seam, 0, -0.17, 0, torso);
    K.box(1.34, 0.03, 0.82, K.m.seam, 0, 0.45, 0, torso);
    K.box(0.03, 0.62, 0.9, K.m.seam, 0, 0.14, 0, torso);
    const head = K.group(0, 2.45, 0, body);
    K.box(0.86, 0.66, 0.74, K.m.stone, 0, 0, 0, head);
    K.box(0.92, 0.12, 0.8, K.m.stone, 0, 0.36, 0, head);
    K.box(0.74, 0.2, 0.06, K.m.plate, 0, 0.02, 0.39, head);
    K.box(0.14, 0.07, 0.04, K.m.glow, -0.18, 0.02, 0.43, head);
    K.box(0.14, 0.07, 0.04, K.m.glow, 0.18, 0.02, 0.43, head);
    const deadEye = K.box(
      0.14,
      0.07,
      0.045,
      K.m.crack,
      -0.18,
      0.02,
      0.43,
      head
    );
    K.gear(K.box(0.98, 0.12, 0.86, K.m.plate, 0, 0.44, 0, head), 42, 52);
    K.gear(K.box(0.12, 0.34, 0.66, K.m.trim, 0, 0.66, -0.02, head), 46, 56);
    K.gear(K.box(0.08, 0.5, 0.08, K.m.plate, -0.5, 0.3, 0, head), 46, 56);
    K.gear(K.box(0.08, 0.5, 0.08, K.m.plate, 0.5, 0.3, 0, head), 46, 56);
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.92, 1.9, 0, body);
      K.box(0.32, 0.72, 0.36, K.m.stone, 0, -0.38, 0, arm);
      K.box(0.38, 0.32, 0.4, K.m.stone, 0, -0.86, 0.02, arm);
      K.gear(K.box(0.62, 0.28, 0.62, K.m.plate, 0, 0.08, 0, arm), 40, 48);
      K.gear(K.box(0.66, 0.06, 0.66, K.m.trim, 0, 0.24, 0, arm), 42, 50);
      K.gear(
        K.cone(0.1, 0.42, 4, K.m.plate, side * 0.16, 0.42, 0, arm),
        46,
        56
      ).rotation.z = -side * 0.35;
      K.gear(K.box(0.46, 0.4, 0.48, K.m.plate, 0, -0.84, 0.02, arm), 42, 52);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    return { torso, head, armL, armR, deadEye, core, headY: 2.45 };
  },
  crest(K, g) {
    K.bar(0.26, -0.36, 0.08, 0.6, g);
    K.bar(0.26, -0.36, -0.08, -0.6, g);
    K.bar(0.26, 0.36, 0.08, -0.6, g);
    K.bar(0.26, 0.36, -0.08, 0.6, g);
    K.bar(0.42, 0, 0, 1.15, g);
    return null;
  },
  wing(K, side, p) {
    for (let k = 0; k < 4; k++) {
      const f = K.group(side * (0.22 + k * 0.32), 0.05 - k * 0.2, -k * 0.05, p);
      const len = 1.25 - k * 0.2;
      K.bar(len, (side * len) / 2, 0, side * (0.75 - k * 0.12), f);
    }
  }
};
