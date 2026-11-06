import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Терминал: a hooded caster. A stepped robe of text-line plates down to the ground, a CRT face
 * with a prompt inside the hood, and a staff topped by a blinking cursor block; phosphor green.
 */
export const terminal: CharacterDef = {
  slug: "terminal",
  pal: {
    base: 0x1f4d2b,
    plate: 0x0d1a12,
    trim: 0x7dfc9a,
    glow: 0x39ff6a,
    aura: 0xb6ffc8
  },
  ui: BODY_UI.terminal,
  master: "Мастер заклинаний",
  stages: [
    "Сгорбленная фигура в балахоне, экран под капюшоном почти погас.",
    "Под капюшоном загорается зелёное приглашение >_, на мантии бегут строки.",
    "Наплечники-клавиши, пояс из кабеля, посох с мигающим курсором.",
    "Парит; вокруг ls, grep, ssh и cd, над капюшоном горит $.",
    "Крылья из строк вывода, мантия светится, посох бьёт зелёным лучом."
  ],
  orbit: ["ls", "grep", "ssh", "cd", "sudo", "|"],
  build(K: Kit, body: THREE.Group) {
    // The robe: three wide stepped plates down to the ground, each with a line of «text».
    const rows: THREE.Object3D[] = [];
    const tiers = [
      { w: 1.7, y: 0.22 },
      { w: 1.38, y: 0.64 },
      { w: 1.1, y: 1.04 }
    ];
    for (const [i, { w, y }] of tiers.entries()) {
      K.box(w, 0.42, w * 0.72, K.m.stone, 0, y, 0, body);
      rows.push(
        K.box(
          w * (0.4 + i * 0.12),
          0.05,
          0.02,
          K.m.seam,
          -w * 0.1,
          y + 0.06,
          w * 0.36 + 0.01,
          body
        )
      );
      K.gear(
        K.box(w + 0.08, 0.06, w * 0.72 + 0.08, K.m.trim, 0, y - 0.19, 0, body),
        42 + i,
        52 + i
      );
    }
    const torso = K.group(0, 1.55, 0, body);
    K.box(1.12, 0.5, 0.7, K.m.stone, 0, 0, 0, torso);
    const core = K.box(0.18, 0.18, 0.04, K.m.glow, 0, 0.02, 0.37, torso);
    K.gear(K.box(1.18, 0.08, 0.76, K.m.trim, 0, -0.22, 0, torso), 40, 50);
    for (const side of [-1, 1]) {
      K.gear(
        K.box(0.46, 0.16, 0.5, K.m.plate, side * 0.7, 0.26, 0, torso),
        42,
        52
      );
      K.gear(
        K.box(0.38, 0.06, 0.42, K.m.trim, side * 0.7, 0.37, 0, torso),
        44,
        54
      );
    }
    // A big hood with the screen face inside.
    const head = K.group(0, 2.22, 0, body);
    K.box(1.06, 0.86, 0.9, K.m.plate, 0, 0, -0.04, head);
    K.box(1.16, 0.16, 1.0, K.m.plate, 0, 0.48, -0.06, head);
    K.cone(0.52, 0.5, 4, K.m.plate, 0, 0.8, -0.1, head).rotation.y =
      Math.PI / 4;
    K.box(0.78, 0.56, 0.04, K.m.stone, 0, -0.02, 0.42, head);
    K.box(0.7, 0.48, 0.03, K.m.plate, 0, -0.02, 0.44, head);
    // The prompt «>_» as the eyes: a chevron and an underscore.
    K.box(0.15, 0.05, 0.03, K.m.glow, -0.2, 0.07, 0.46, head).rotation.z = -0.6;
    K.box(0.15, 0.05, 0.03, K.m.glow, -0.2, -0.02, 0.46, head).rotation.z = 0.6;
    K.box(0.2, 0.06, 0.03, K.m.glow, 0.14, -0.1, 0.46, head);
    const deadEye = K.box(
      0.26,
      0.18,
      0.035,
      K.m.crack,
      -0.18,
      0.03,
      0.45,
      head
    );
    K.gear(K.box(1.22, 0.08, 1.04, K.m.trim, 0, 0.57, -0.06, head), 44, 54);
    // Wide sleeves spread to the sides; the right hand holds the staff.
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.82, 1.8, 0, body);
      arm.rotation.z = side * 0.35;
      K.box(0.34, 0.72, 0.38, K.m.plate, 0, -0.36, 0, arm);
      K.box(0.48, 0.26, 0.48, K.m.stone, 0, -0.78, 0.02, arm);
      K.gear(K.box(0.5, 0.06, 0.5, K.m.trim, 0, -0.64, 0.02, arm), 42, 52);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    const staff = K.group(0.05, -0.85, 0.24, armR);
    staff.rotation.z = -0.35;
    K.gear(K.box(0.09, 2.6, 0.09, K.m.plate, 0, 0.3, 0, staff), 44, 54);
    const cursor = K.gear(
      K.box(0.26, 0.4, 0.14, K.m.glow, 0, 1.75, 0, staff),
      46,
      56
    );
    return {
      torso,
      head,
      armL,
      armR,
      deadEye,
      core,
      headY: 2.22,
      // The text lines and the cursor blink like a live terminal.
      rows: [...rows, cursor]
    };
  },
  crest(K, g) {
    // A glowing «$» made of bars.
    K.bar(0.36, 0, 0.2, 0, g);
    K.bar(0.36, 0, 0, 0, g);
    K.bar(0.36, 0, -0.2, 0, g);
    K.bar(0.2, -0.18, 0.1, Math.PI / 2, g);
    K.bar(0.2, 0.18, -0.1, Math.PI / 2, g);
    K.bar(0.62, 0, 0, Math.PI / 2, g, undefined, 0.03);
    return null;
  },
  wing(K, side, p) {
    // Lines of output fanning out like feathers.
    for (let k = 0; k < 5; k++) {
      const len = 1.3 - k * 0.16;
      K.bar(len, (side * len) / 2, 0.3 - k * 0.2, side * (0.5 - k * 0.12), p);
    }
  }
};
