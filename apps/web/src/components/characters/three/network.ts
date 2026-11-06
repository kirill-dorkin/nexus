import type * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/**
 * Сеть и HTTP, the postman: a lean runner with long legs, a router satchel with blinking port
 * lights across the chest, an antenna head with a signal dish; indigo.
 */
export const network: CharacterDef = {
  slug: "network",
  pal: {
    base: 0x3a3f8f,
    plate: 0x14163a,
    trim: 0xb4b9ff,
    glow: 0x818cf8,
    aura: 0xd6d9ff
  },
  ui: BODY_UI.network,
  master: "Мастер маршрутов",
  stages: [
    "Худой курьер без сумки, антенна на голове поникла.",
    "Антенна выпрямляется, на груди мигают огоньки портов.",
    "Сумка-коммутатор через плечо, наколенники и тарелка связи.",
    "Парит; вокруг TCP, DNS, TLS и 443, над головой волны сигнала.",
    "Крылья из волн сигнала, все порты горят индиго."
  ],
  orbit: ["TCP", "DNS", "TLS", "443", "HTTP/3", "UDP"],
  build(K: Kit, body: THREE.Group) {
    // Long runner legs.
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.26, 1.2, 0, body);
      K.box(0.24, 1.1, 0.28, K.m.stone, 0, -0.56, 0, leg);
      K.box(0.32, 0.12, 0.5, K.m.stone, 0, -1.12, 0.08, leg);
      K.gear(K.box(0.3, 0.22, 0.32, K.m.plate, 0, -0.5, 0.04, leg), 42, 52);
    }
    const torso = K.group(0, 1.75, 0, body);
    K.box(0.9, 0.8, 0.5, K.m.stone, 0, 0, 0, torso);
    // Port lights across the chest.
    const rows: THREE.Object3D[] = [];
    for (let i = 0; i < 4; i++)
      rows.push(
        K.box(0.08, 0.08, 0.03, K.m.glow, -0.24 + i * 0.16, 0.18, 0.26, torso)
      );
    const core = K.box(0.2, 0.2, 0.04, K.m.glow, 0, -0.1, 0.26, torso);
    // The router satchel on a strap.
    K.gear(
      K.box(0.08, 1.1, 0.06, K.m.trim, 0.1, 0.05, 0.28, torso),
      40,
      50
    ).rotation.z = 0.7;
    K.gear(K.box(0.56, 0.36, 0.26, K.m.plate, 0.5, -0.42, 0.12, torso), 42, 52);
    // The antenna head with a dish.
    const head = K.group(0, 2.48, 0, body);
    K.box(0.62, 0.56, 0.56, K.m.stone, 0, 0, 0, head);
    K.box(0.12, 0.09, 0.03, K.m.glow, -0.13, 0.04, 0.29, head);
    K.box(0.12, 0.09, 0.03, K.m.glow, 0.13, 0.04, 0.29, head);
    const deadEye = K.box(
      0.13,
      0.1,
      0.035,
      K.m.crack,
      -0.13,
      0.04,
      0.295,
      head
    );
    K.box(0.04, 0.5, 0.04, K.m.trim, 0.18, 0.5, 0, head);
    K.ico(0.06, K.m.glow, 0.18, 0.78, 0, head, 0);
    K.gear(
      K.cone(0.22, 0.14, 12, K.m.plate, -0.2, 0.4, 0, head),
      44,
      54
    ).rotation.z = 0.5;
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.56, 2.05, 0, body);
      K.box(0.18, 0.75, 0.2, K.m.stone, 0, -0.38, 0, arm);
      K.box(0.24, 0.18, 0.24, K.m.stone, 0, -0.82, 0.02, arm);
      K.gear(K.box(0.3, 0.2, 0.3, K.m.plate, 0, 0.02, 0, arm), 40, 48);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    return { torso, head, armL, armR, deadEye, core, headY: 2.48, rows };
  },
  crest(K, g) {
    // Signal waves: three growing arcs drawn with bars.
    for (let k = 0; k < 3; k++) {
      const r = 0.14 + k * 0.12;
      K.bar(r, -r * 0.5, k * 0.1, 0.7, g);
      K.bar(r, r * 0.5, k * 0.1, -0.7, g);
    }
    return null;
  },
  wing(K, side, p) {
    // Wings of signal waves: concentric arcs.
    for (let k = 0; k < 4; k++) {
      const r = 0.3 + k * 0.28;
      K.bar(r, side * (0.3 + k * 0.3), 0.2 - k * 0.05, side * 0.9, p);
      K.bar(r, side * (0.3 + k * 0.3), -0.2 + k * 0.05, -side * 0.9, p);
    }
  }
};
