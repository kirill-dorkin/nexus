import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Python, the sage: a robed scholar with a long beard and a hood, an open book on the chest and
 * a staff topped with two coiled serpents (blue and gold); blue robe with gold trim.
 */
export const python: CharacterDef = {
  slug: "python",
  pal: {
    base: 0x2b5b8c,
    plate: 0x10243a,
    trim: 0xffd43b,
    glow: 0xffd43b,
    aura: 0xfff3b0
  },
  ui: BODY_UI.python,
  master: "Мастер мудрости",
  stages: [
    "Сутулый ученик в простой мантии, посох — голая палка.",
    "Мантия выпрямляется, на груди открывается книга со светящимися строками.",
    "Капюшон, длинная борода и наплечники; на посохе свиваются два змея.",
    "Парит; вокруг def, for, import и 3.13, над головой открытая книга.",
    "Крылья из страниц, вся мантия горит золотом."
  ],
  orbit: ["def", "for", "import", "yield", "pip", "3.13"],
  build(K: Kit, body: THREE.Group) {
    // The robe: a wide cone instead of legs, with gold hem.
    const robe = K.group(0, 0.75, 0, body);
    K.cyl(0.42, 0.72, 1.5, 10, K.m.stone, 0, 0, 0, robe);
    K.gear(K.torus(0.7, 0.05, K.m.trim, 0, -0.72, 0, robe), 42, 52).rotation.x =
      Math.PI / 2;
    const torso = K.group(0, 1.8, 0, body);
    K.box(0.86, 0.72, 0.5, K.m.stone, 0, 0, 0, torso);
    // The open book on the chest with glowing lines.
    K.gear(K.box(0.56, 0.4, 0.06, K.m.plate, 0, 0.02, 0.27, torso), 40, 50);
    const rows: THREE.Object3D[] = [];
    for (let i = 0; i < 3; i++)
      rows.push(
        K.box(0.4, 0.04, 0.03, K.m.glow, 0, 0.14 - i * 0.1, 0.3, torso)
      );
    const core = K.box(0.06, 0.38, 0.04, K.m.glow, 0, 0.02, 0.31, torso);
    // Shoulder plates.
    for (const side of [-1, 1])
      K.gear(
        K.box(0.34, 0.14, 0.52, K.m.plate, side * 0.5, 0.36, 0, torso),
        44,
        54
      );
    // The head: hood, eyes and a long beard.
    const head = K.group(0, 2.45, 0, body);
    K.box(0.58, 0.54, 0.54, K.m.stone, 0, 0, 0, head);
    K.box(0.12, 0.08, 0.03, K.m.glow, -0.13, 0.06, 0.28, head);
    K.box(0.12, 0.08, 0.03, K.m.glow, 0.13, 0.06, 0.28, head);
    const deadEye = K.box(
      0.13,
      0.09,
      0.035,
      K.m.crack,
      -0.13,
      0.06,
      0.285,
      head
    );
    K.gear(
      K.cone(0.22, 0.6, 4, K.m.trim, 0, -0.42, 0.24, head),
      40,
      50
    ).rotation.x = Math.PI;
    K.gear(
      K.cone(0.46, 0.5, 4, K.m.plate, 0, 0.42, -0.04, head),
      42,
      52
    ).rotation.y = Math.PI / 4;
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.56, 2.05, 0, body);
      // Wide sleeves.
      K.cyl(0.12, 0.2, 0.78, 8, K.m.stone, 0, -0.38, 0, arm);
      K.box(0.18, 0.16, 0.18, K.m.stone, 0, -0.84, 0.02, arm);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // The staff in the right hand, with two serpents at the top.
    const staff = K.group(0, -0.84, 0.12, armR);
    K.cyl(0.04, 0.04, 2.1, 6, K.m.trim, 0, 0.1, 0, staff);
    K.gear(K.torus(0.12, 0.035, K.m.glow, 0, 1.15, 0, staff), 44, 54);
    K.gear(
      K.torus(0.12, 0.035, K.m.plate, 0, 1.3, 0, staff),
      44,
      54
    ).rotation.y = Math.PI / 2;
    K.ico(0.08, K.m.glow, 0, 1.48, 0, staff, 0);
    return { torso, head, armL, armR, deadEye, core, headY: 2.45, rows };
  },
  crest(K, g) {
    // An open book: two pages tilted like a roof.
    K.bar(0.36, -0.17, 0, -0.35, g);
    K.bar(0.36, 0.17, 0, 0.35, g);
    K.bar(0.2, 0, 0.12, Math.PI / 2, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of pages: a fan of long sheets.
    for (let k = 0; k < 5; k++)
      K.bar(
        1.0 - k * 0.12,
        side * (0.5 + k * 0.08),
        0.3 - k * 0.18,
        side * (0.5 - k * 0.25),
        p
      );
  }
};
