import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Операционная система, the dispatcher: a broad control-room operator with a headset, a panel
 * of process lights on the chest, a kernel core glowing in the middle and a clipboard of
 * schedules; graphite with amber signal lights.
 */
export const os: CharacterDef = {
  slug: "os",
  pal: {
    base: 0x4a4038,
    plate: 0x1c1712,
    trim: 0xffc46b,
    glow: 0xf59e0b,
    aura: 0xffe2a8
  },
  ui: BODY_UI.os,
  master: "Мастер ядра",
  stages: [
    "Сонный дежурный без пульта, гарнитура выключена.",
    "На груди загорается панель процессов, в центре — ядро.",
    "Гарнитура, наплечники и планшет с расписанием смен.",
    "Парит; вокруг PID, fork, epoll и cgroups, над головой шестерня ядра.",
    "Крылья из табло процессов, все огни горят янтарём."
  ],
  orbit: ["PID", "fork", "epoll", "cgroups", "inode", "SIGTERM"],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.28, 1.08, 0, body);
      K.box(0.3, 1.0, 0.32, K.m.stone, 0, -0.5, 0, leg);
      K.box(0.38, 0.14, 0.48, K.m.plate, 0, -1.0, 0.06, leg);
    }
    const torso = K.group(0, 1.68, 0, body);
    K.box(1.0, 0.86, 0.56, K.m.stone, 0, 0, 0, torso);
    // A grid of process lights.
    const rows: THREE.Object3D[] = [];
    for (let r = 0; r < 3; r++)
      for (let col = 0; col < 4; col++)
        if (r !== 1 || (col !== 1 && col !== 2))
          rows.push(
            K.box(
              0.09,
              0.09,
              0.03,
              K.m.glow,
              -0.27 + col * 0.18,
              0.2 - r * 0.18,
              0.29,
              torso
            )
          );
    // The kernel core in the middle.
    const core = K.box(0.26, 0.12, 0.04, K.m.trim, 0, 0.02, 0.3, torso);
    for (const side of [-1, 1])
      K.gear(
        K.box(0.34, 0.14, 0.58, K.m.plate, side * 0.62, 0.4, 0, torso),
        42,
        52
      );
    // The head with a headset.
    const head = K.group(0, 2.4, 0, body);
    K.box(0.6, 0.54, 0.54, K.m.stone, 0, 0, 0, head);
    K.box(0.12, 0.08, 0.03, K.m.glow, -0.13, 0.05, 0.28, head);
    K.box(0.12, 0.08, 0.03, K.m.glow, 0.13, 0.05, 0.28, head);
    const deadEye = K.box(
      0.13,
      0.09,
      0.035,
      K.m.crack,
      -0.13,
      0.05,
      0.285,
      head
    );
    K.gear(K.box(0.7, 0.06, 0.08, K.m.trim, 0, 0.32, 0, head), 40, 50);
    for (const side of [-1, 1])
      K.gear(
        K.box(0.08, 0.2, 0.2, K.m.plate, side * 0.34, 0.04, 0, head),
        40,
        50
      );
    K.gear(K.box(0.2, 0.04, 0.04, K.m.trim, -0.24, -0.16, 0.24, head), 42, 52);
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.66, 2.0, 0, body);
      K.box(0.22, 0.78, 0.24, K.m.stone, 0, -0.39, 0, arm);
      K.box(0.26, 0.18, 0.26, K.m.stone, 0, -0.84, 0.02, arm);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // The clipboard with the shift schedule.
    K.gear(K.box(0.36, 0.46, 0.04, K.m.plate, 0, -0.98, 0.18, armL), 44, 54);
    K.gear(K.box(0.26, 0.04, 0.02, K.m.glow, 0, -0.9, 0.21, armL), 44, 54);
    return { torso, head, armL, armR, deadEye, core, headY: 2.4, rows };
  },
  crest(K, g) {
    // A kernel gear: a ring with spokes.
    K.torus(0.18, 0.05, K.m.hot, 0, 0, 0, g);
    K.bar(0.5, 0, 0, 0, g);
    K.bar(0.5, 0, 0, Math.PI / 2, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of process boards: a grid of short bars.
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 3; k++)
        K.bar(
          0.24,
          side * (0.4 + k * 0.3),
          0.3 - r * 0.24,
          0,
          p,
          undefined,
          0.12
        );
  }
};
