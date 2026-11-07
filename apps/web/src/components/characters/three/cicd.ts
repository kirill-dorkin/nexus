import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * CI/CD, the conveyor: a factory robot with a conveyor belt across the shoulders carrying
 * checked boxes, a traffic-light chest of green, amber and red stages, and a stamp in hand;
 * violet steel.
 */
export const cicd: CharacterDef = {
  slug: "cicd",
  pal: {
    base: 0x4b3f8a,
    plate: 0x1c1838,
    trim: 0xd9d2ff,
    glow: 0x8b7cf6,
    aura: 0xe4defe
  },
  ui: BODY_UI.cicd,
  master: "Мастер доставки",
  stages: [
    "Неуклюжий робот с выключенной лентой, ни одной лампы.",
    "Загорается светофор этапов на груди, лента дёргается.",
    "Лента на плечах везёт ящики, в руке — штамп «проверено».",
    "Парит; вокруг build, test, deploy и SHA, над головой зелёная галочка.",
    "Крылья из лент конвейера, все этапы горят фиолетовым."
  ],
  orbit: ["build", "test", "deploy", "cache", "SHA", "rollback"],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.3, 1.06, 0, body);
      K.box(0.3, 0.98, 0.34, K.m.stone, 0, -0.49, 0, leg);
      K.box(0.4, 0.16, 0.5, K.m.plate, 0, -0.98, 0.06, leg);
    }
    const torso = K.group(0, 1.66, 0, body);
    K.box(0.96, 0.84, 0.56, K.m.stone, 0, 0, 0, torso);
    // The stage lights: three lamps in a column.
    const rows: THREE.Object3D[] = [];
    for (let i = 0; i < 3; i++)
      rows.push(
        K.cyl(0.08, 0.08, 0.04, 12, K.m.glow, 0, 0.24 - i * 0.22, 0.29, torso)
      );
    for (const r of rows) r.rotation.x = Math.PI / 2;
    const core = K.box(0.24, 0.66, 0.03, K.m.plate, 0, 0.02, 0.28, torso);
    // The conveyor belt across the shoulders with boxes on it.
    K.gear(K.box(1.5, 0.08, 0.36, K.m.plate, 0, 0.5, 0, torso), 42, 52);
    for (const x of [-0.5, 0, 0.5])
      K.gear(K.box(0.2, 0.18, 0.22, K.m.trim, x, 0.64, 0, torso), 44, 54);
    const head = K.group(0, 2.38, 0, body);
    K.box(0.58, 0.5, 0.52, K.m.stone, 0, 0, 0, head);
    K.box(0.42, 0.08, 0.03, K.m.glow, 0, 0.04, 0.27, head);
    const deadEye = K.box(0.2, 0.09, 0.035, K.m.crack, -0.1, 0.04, 0.275, head);
    K.box(0.06, 0.18, 0.06, K.m.trim, 0, 0.34, 0, head);
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.64, 1.98, 0, body);
      K.box(0.22, 0.78, 0.24, K.m.stone, 0, -0.39, 0, arm);
      K.box(0.28, 0.2, 0.28, K.m.stone, 0, -0.86, 0.02, arm);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // The approval stamp.
    K.gear(K.cyl(0.05, 0.05, 0.24, 8, K.m.trim, 0, -1.02, 0.12, armR), 40, 50);
    K.gear(K.box(0.22, 0.08, 0.22, K.m.glow, 0, -1.16, 0.12, armR), 40, 50);
    return { torso, head, armL, armR, deadEye, core, headY: 2.38, rows };
  },
  crest(K, g) {
    // A check mark.
    K.bar(0.18, -0.1, -0.02, -0.8, g);
    K.bar(0.36, 0.08, 0.06, 0.9, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of conveyor belts: long bars with short cross ribs.
    for (let k = 0; k < 3; k++) {
      K.bar(
        1.0 - k * 0.15,
        side * (0.55 + k * 0.08),
        0.3 - k * 0.28,
        side * 0.2,
        p
      );
      K.bar(0.14, side * (0.4 + k * 0.08), 0.36 - k * 0.28, Math.PI / 2, p);
    }
  }
};
