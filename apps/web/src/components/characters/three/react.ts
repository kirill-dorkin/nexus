import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * React, the interface assembler: a modular body of stacked component blocks on stubby legs, an
 * atom head (a nucleus with three orbits) and manipulator arms with clamp hands; React cyan.
 */
export const react: CharacterDef = {
  slug: "react",
  pal: {
    base: 0x1e5064,
    plate: 0x0b1d26,
    trim: 0x9ff0ff,
    glow: 0x61dafb,
    aura: 0xc4f4ff
  },
  ui: BODY_UI.react,
  master: "Мастер компонентов",
  stages: [
    "Неподвижный набор блоков, атом на голове не вращается.",
    "Орбиты атома начинают кружиться, блоки тела подсвечиваются.",
    "Блоки-компоненты собраны в броню, манипуляторы с захватами.",
    "Парит; вокруг useState, props, JSX и key, над головой скобки </>.",
    "Крылья из панелей интерфейса, атом сияет голубым."
  ],
  orbit: ["props", "useState", "JSX", "key", "useEffect", "<App/>"],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.3, 0.7, 0, body);
      K.box(0.34, 0.6, 0.38, K.m.stone, 0, -0.32, 0, leg);
      K.box(0.44, 0.14, 0.54, K.m.stone, 0, -0.64, 0.06, leg);
      K.gear(K.box(0.42, 0.06, 0.46, K.m.trim, 0, -0.08, 0, leg), 44, 54);
    }
    // A body of stacked component blocks, slightly offset like a layout.
    const torso = K.group(0, 1.35, 0, body);
    K.box(1.2, 0.42, 0.8, K.m.stone, 0, -0.32, 0, torso);
    K.box(1.0, 0.42, 0.74, K.m.stone, 0.08, 0.12, 0, torso);
    K.box(1.16, 0.36, 0.78, K.m.stone, -0.04, 0.52, 0, torso);
    const core = K.box(0.26, 0.26, 0.04, K.m.glow, 0, 0.12, 0.38, torso);
    for (let i = 0; i < 3; i++)
      K.gear(
        K.box(0.9, 0.05, 0.02, K.m.trim, 0, -0.32 + i * 0.42, 0.41, torso),
        40 + i * 2,
        50 + i * 2
      );
    // The atom head: a nucleus and three tilted orbits.
    const head = K.group(0, 2.28, 0, body);
    K.ico(0.32, K.m.stone, 0, 0, 0, head, 1);
    K.box(0.1, 0.1, 0.03, K.m.glow, -0.11, 0.05, 0.31, head);
    K.box(0.1, 0.1, 0.03, K.m.glow, 0.11, 0.05, 0.31, head);
    const deadEye = K.box(
      0.11,
      0.11,
      0.035,
      K.m.crack,
      -0.11,
      0.05,
      0.315,
      head
    );
    const spinners: THREE.Object3D[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = K.group(0, 0, 0, head);
      ring.rotation.y = (i * Math.PI) / 3;
      const t = K.torus(0.62, 0.035, K.m.trim, 0, 0, 0, ring, 28);
      t.rotation.x = Math.PI / 2.6;
      spinners.push(ring);
    }
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.72, 1.75, 0, body);
      K.box(0.22, 0.62, 0.22, K.m.stone, 0, -0.32, 0, arm);
      K.box(0.3, 0.12, 0.3, K.m.plate, 0, -0.66, 0, arm);
      K.box(0.06, 0.22, 0.14, K.m.trim, -0.1, -0.82, 0.06, arm);
      K.box(0.06, 0.22, 0.14, K.m.trim, 0.1, -0.82, 0.06, arm);
      K.gear(K.box(0.4, 0.22, 0.4, K.m.plate, 0, 0.04, 0, arm), 40, 48);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    return { torso, head, armL, armR, deadEye, core, headY: 2.28, spinners };
  },
  crest(K, g) {
    // «</>» drawn with bars.
    K.bar(0.2, -0.3, 0.07, 0.6, g);
    K.bar(0.2, -0.3, -0.07, -0.6, g);
    K.bar(0.36, 0, 0, 1.25, g);
    K.bar(0.2, 0.3, 0.07, -0.6, g);
    K.bar(0.2, 0.3, -0.07, 0.6, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of interface panels: thin rectangles fanning out.
    for (let k = 0; k < 4; k++) {
      const panel = K.box(
        0.5 - k * 0.06,
        0.3,
        0.03,
        K.m.hot,
        side * (0.4 + k * 0.42),
        0.15 - k * 0.14,
        -k * 0.04,
        p
      );
      panel.rotation.z = side * (0.25 - k * 0.08);
    }
  }
};
