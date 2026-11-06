import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Docker, the container hauler: a broad dock worker carrying a stack of shipping containers on
 * the back, a crane-hook arm and a porthole visor; deep sea blue with signal-blue containers.
 */
export const docker: CharacterDef = {
  slug: "docker",
  pal: {
    base: 0x1c4f91,
    plate: 0x0b1e3a,
    trim: 0x7cc4ff,
    glow: 0x2496ed,
    aura: 0xbfe3ff
  },
  ui: BODY_UI.docker,
  master: "Мастер флота",
  stages: [
    "Худой портовый рабочий без груза, крюк висит без дела.",
    "Плечи шире, на спине первый контейнер, в иллюминаторе зажёгся свет.",
    "Стопка из трёх контейнеров, крюк-кран на руке, наплечники.",
    "Парит; вокруг FROM, RUN, :latest и compose, над головой маяк.",
    "Крылья из контейнеров, весь груз горит синим."
  ],
  orbit: ["FROM", "RUN", "COPY", "compose", "-p 80", "volume"],
  build(K: Kit, body: THREE.Group) {
    // Sturdy short legs with heavy boots.
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.3, 1.0, 0, body);
      K.box(0.32, 0.92, 0.34, K.m.stone, 0, -0.46, 0, leg);
      K.box(0.42, 0.18, 0.56, K.m.plate, 0, -0.92, 0.08, leg);
    }
    const torso = K.group(0, 1.6, 0, body);
    K.box(1.1, 0.9, 0.62, K.m.stone, 0, 0, 0, torso);
    // A round porthole on the chest.
    K.gear(K.torus(0.2, 0.05, K.m.trim, 0, 0.05, 0.32, torso), 40, 50);
    const core = K.cyl(0.15, 0.15, 0.04, 16, K.m.glow, 0, 0.05, 0.31, torso);
    core.rotation.x = Math.PI / 2;
    // Containers stacked on the back.
    const rows: THREE.Object3D[] = [];
    rows.push(K.box(0.9, 0.34, 0.4, K.m.glow, 0, -0.18, -0.52, torso));
    rows.push(
      K.gear(K.box(0.8, 0.32, 0.38, K.m.trim, 0, 0.18, -0.52, torso), 42, 52)
    );
    rows.push(
      K.gear(K.box(0.7, 0.3, 0.36, K.m.glow, 0, 0.52, -0.52, torso), 44, 54)
    );
    for (const side of [-1, 1])
      K.gear(
        K.box(0.36, 0.16, 0.6, K.m.plate, side * 0.66, 0.42, 0, torso),
        42,
        52
      );
    // The head with a visor like a porthole strip.
    const head = K.group(0, 2.35, 0, body);
    K.box(0.6, 0.52, 0.56, K.m.stone, 0, 0, 0, head);
    K.box(0.12, 0.08, 0.03, K.m.glow, -0.13, 0.04, 0.29, head);
    K.box(0.12, 0.08, 0.03, K.m.glow, 0.13, 0.04, 0.29, head);
    const deadEye = K.box(
      0.13,
      0.09,
      0.035,
      K.m.crack,
      -0.13,
      0.04,
      0.295,
      head
    );
    K.gear(K.box(0.66, 0.12, 0.6, K.m.plate, 0, 0.3, 0, head), 40, 50);
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.7, 1.9, 0, body);
      K.box(0.24, 0.8, 0.26, K.m.stone, 0, -0.4, 0, arm);
      K.box(0.3, 0.2, 0.3, K.m.stone, 0, -0.86, 0.02, arm);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // The crane hook on the right hand.
    K.gear(K.box(0.04, 0.4, 0.04, K.m.trim, 0, -1.12, 0.02, armR), 40, 50);
    K.gear(K.torus(0.1, 0.03, K.m.trim, 0, -1.38, 0.02, armR), 40, 50);
    return { torso, head, armL, armR, deadEye, core, headY: 2.35, rows };
  },
  crest(K, g) {
    // A lighthouse beam: a mast with two rays.
    K.bar(0.3, 0, 0, Math.PI / 2, g);
    K.bar(0.36, -0.2, 0.14, 0.25, g);
    K.bar(0.36, 0.2, 0.14, -0.25, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of stacked containers: short wide bars in steps.
    for (let k = 0; k < 4; k++)
      K.bar(
        0.7 - k * 0.08,
        side * (0.45 + k * 0.22),
        0.36 - k * 0.24,
        0,
        p,
        undefined,
        0.16
      );
  }
};
