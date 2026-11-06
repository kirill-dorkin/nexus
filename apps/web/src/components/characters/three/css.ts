import * as THREE from "three";
import type { Kit } from "./kit";
import type { CharacterDef } from "./types";

const PAINTS = [0xff5d8f, 0x2dd4bf, 0xffd166, 0xb388ff] as const;
const paint = (c: number, intensity: number) =>
  new THREE.MeshStandardMaterial({
    color: c,
    emissive: c,
    emissiveIntensity: intensity
  });

/** CSS: tall and slender, a core in nested box-model frames, a crystal head, brush and palette; indigo and violet. */
export const css: CharacterDef = {
  slug: "css",
  pal: {
    base: 0x4a2fb0,
    plate: 0x1a1640,
    trim: 0x2dd4bf,
    glow: 0xb388ff,
    aura: 0xe0ccff
  },
  ui: ["#a78bfa", "#ddd6fe", "#6d28d9", "#2e1065"],
  master: "Мастер стилей",
  stages: [
    "Тонкая серая фигура, рамки тусклые.",
    "Рамки box model загораются фиолетовым, голова-кристалл светится.",
    "Длинные ноги в латах, пояс flexbox, щит-палитра.",
    "Парит; вокруг flex, grid, rem; над головой { }.",
    "Плащ из цветных полос, кисть оставляет след."
  ],
  orbit: ["flex", "grid", "rem", "hover", "::after", "z-index"],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.24, 1.25, 0, body);
      K.box(0.18, 1.2, 0.22, K.m.stone, 0, -0.62, 0, leg);
      K.box(0.26, 0.1, 0.42, K.m.stone, 0, -1.2, 0.08, leg);
      K.gear(K.box(0.26, 0.5, 0.3, K.m.plate, 0, -0.4, 0.02, leg), 42, 52);
      K.gear(K.box(0.3, 0.06, 0.34, K.m.trim, 0, -0.66, 0.02, leg), 44, 54);
    }
    const torso = K.group(0, 1.85, 0, body);
    K.box(0.5, 0.7, 0.36, K.m.stone, 0, 0, 0, torso);
    const core = K.oct(0.13, K.m.glow, 0, 0.05, 0.2, torso);
    K.frame(0.72, 0.9, 0.52, K.m.plate, torso, 0.05);
    const border = K.gear(
      K.frame(0.92, 1.08, 0.66, K.m.trim, torso, 0.04),
      40,
      50
    );
    const margin = K.frame(1.1, 1.26, 0.8, K.m.seam, torso, 0.03);
    K.gear(K.box(0.9, 0.1, 0.5, K.m.trim, 0, -0.5, 0, torso), 44, 54);
    const head = K.group(0, 2.85, 0, body);
    const crystal = K.oct(0.34, K.m.stone, 0, 0.1, 0, head);
    crystal.scale.y = 1.4;
    K.box(0.1, 0.05, 0.04, K.m.glow, -0.1, 0.08, 0.26, head);
    K.box(0.1, 0.05, 0.04, K.m.glow, 0.1, 0.08, 0.26, head);
    const deadEye = K.box(0.1, 0.05, 0.045, K.m.crack, -0.1, 0.08, 0.26, head);
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.56, 2.2, 0, body);
      K.box(0.14, 0.9, 0.16, K.m.stone, 0, -0.45, 0, arm);
      K.box(0.2, 0.16, 0.2, K.m.plate, 0, -0.95, 0, arm);
      K.gear(K.box(0.34, 0.12, 0.34, K.m.trim, 0, 0.04, 0, arm), 40, 48);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    const staff = K.group(0, -0.95, 0.12, armR);
    K.cyl(0.035, 0.035, 2.2, 6, K.m.plate, 0, 0.45, 0, staff);
    const bristle = K.cone(0.1, 0.32, 6, K.m.stone, 0, 1.68, 0, staff);
    K.gear(
      K.cyl(0.4, 0.4, 0.05, 12, K.m.plate, 0, -0.7, 0.24, armL),
      42,
      52
    ).rotation.x = Math.PI / 2;
    PAINTS.forEach((c, i) => {
      K.gear(
        K.cyl(
          0.07,
          0.07,
          0.04,
          8,
          paint(c, 0.7),
          -0.2 + i * 0.13,
          -0.6,
          0.28,
          armL
        ),
        44,
        54
      ).rotation.x = Math.PI / 2;
    });
    return {
      torso,
      head,
      armL,
      armR,
      deadEye,
      core,
      headY: 2.85,
      paint: bristle,
      swayers: [border, margin],
      spinners: [crystal],
      seamsEarly: true
    };
  },
  crest(K, g) {
    for (const side of [-1, 1]) {
      K.bar(0.24, side * 0.22, 0.14, side * 1.3, g);
      K.bar(0.24, side * 0.22, -0.14, -side * 1.3, g);
      K.bar(0.1, side * 0.3, 0, 0, g);
    }
    return null;
  },
  wing(K, side, p) {
    [PAINTS[0], PAINTS[2], PAINTS[1], PAINTS[3]].forEach((c, k) => {
      const f = K.group(side * (0.12 + k * 0.16), -0.1 - k * 0.08, -0.1, p);
      K.box(
        0.15,
        1.7 - k * 0.15,
        0.04,
        paint(c, 0.8),
        0,
        -0.5,
        0,
        f
      ).rotation.z = side * 0.16;
    });
  }
};
