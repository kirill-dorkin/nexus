import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Web API, the liaison: a slim courier-operator with a backpack radio and two antennas, a
 * patch panel of sockets on the chest and a signal lamp in hand; teal with copper trim.
 */
export const webapi: CharacterDef = {
  slug: "webapi",
  pal: {
    base: 0x1f6f6a,
    plate: 0x0b2725,
    trim: 0xf3b37a,
    glow: 0x22d3c5,
    aura: 0xccfbf1
  },
  ui: BODY_UI.webapi,
  master: "Мастер связи",
  stages: [
    "Курьер без рации, антенны сложены.",
    "На груди загораются гнёзда коммутатора, антенны поднимаются.",
    "Рация за спиной, наплечники и сигнальная лампа в руке.",
    "Парит; вокруг fetch, DOM, Worker и WebSocket, над головой волны сигнала.",
    "Крылья из проводов связи, все гнёзда горят бирюзой."
  ],
  orbit: ["fetch", "DOM", "Worker", "WebSocket", "Canvas", "IndexedDB"],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.25, 1.18, 0, body);
      K.box(0.24, 1.1, 0.28, K.m.stone, 0, -0.55, 0, leg);
      K.box(0.32, 0.12, 0.46, K.m.plate, 0, -1.1, 0.06, leg);
    }
    const torso = K.group(0, 1.78, 0, body);
    K.box(0.84, 0.78, 0.48, K.m.stone, 0, 0, 0, torso);
    // Patch panel: a grid of sockets.
    const rows: THREE.Object3D[] = [];
    for (let r = 0; r < 2; r++)
      for (let col = 0; col < 3; col++) {
        const socket = K.cyl(
          0.05,
          0.05,
          0.03,
          10,
          K.m.glow,
          -0.18 + col * 0.18,
          0.14 - r * 0.18,
          0.25,
          torso
        );
        socket.rotation.x = Math.PI / 2;
        rows.push(socket);
      }
    const core = K.box(0.5, 0.04, 0.03, K.m.trim, 0, -0.2, 0.26, torso);
    // The backpack radio with two antennas.
    K.gear(K.box(0.6, 0.6, 0.3, K.m.plate, 0, 0.02, -0.4, torso), 42, 52);
    for (const side of [-1, 1])
      K.gear(
        K.box(0.03, 0.7, 0.03, K.m.trim, side * 0.2, 0.62, -0.42, torso),
        44,
        54
      );
    const head = K.group(0, 2.48, 0, body);
    K.box(0.54, 0.52, 0.5, K.m.stone, 0, 0, 0, head);
    K.box(0.11, 0.08, 0.03, K.m.glow, -0.12, 0.04, 0.26, head);
    K.box(0.11, 0.08, 0.03, K.m.glow, 0.12, 0.04, 0.26, head);
    const deadEye = K.box(
      0.12,
      0.09,
      0.035,
      K.m.crack,
      -0.12,
      0.04,
      0.265,
      head
    );
    // A headset microphone.
    K.gear(K.box(0.06, 0.2, 0.2, K.m.plate, 0.3, 0, 0, head), 40, 50);
    K.gear(
      K.box(0.18, 0.03, 0.03, K.m.trim, 0.22, -0.14, 0.2, head),
      40,
      50
    ).rotation.y = 0.6;
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.54, 2.1, 0, body);
      K.box(0.17, 0.78, 0.19, K.m.stone, 0, -0.39, 0, arm);
      K.box(0.21, 0.16, 0.21, K.m.stone, 0, -0.84, 0.02, arm);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    // The signal lamp.
    K.gear(K.ico(0.1, K.m.glow, 0, -1.0, 0.14, armR, 1), 42, 52);
    return { torso, head, armL, armR, deadEye, core, headY: 2.48, rows };
  },
  crest(K, g) {
    // Two antennas with a wave between them.
    K.bar(0.36, -0.14, 0.04, Math.PI / 2 - 0.2, g);
    K.bar(0.36, 0.14, 0.04, Math.PI / 2 + 0.2, g);
    K.bar(0.22, 0, 0.16, 0, g);
    return null;
  },
  wing(K, side, p) {
    // Wings of cables: long gently curving bars.
    for (let k = 0; k < 4; k++)
      K.bar(
        1.05 - k * 0.16,
        side * (0.5 + k * 0.1),
        0.32 - k * 0.2,
        side * (0.35 - k * 0.12),
        p,
        undefined,
        0.06
      );
  }
};
