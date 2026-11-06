import * as THREE from "three";
import type { Kit } from "./kit";
import { BODY_UI } from "./meta";
import type { CharacterDef } from "./types";

/** SQL: a squat drum with glowing rings and data rows, a PRIMARY KEY and an index shield; teal and bronze. */
export const sql: CharacterDef = {
  slug: "sql",
  pal: {
    base: 0x13756b,
    plate: 0x0d2b28,
    trim: 0xc59a5b,
    glow: 0x2dd4bf,
    aura: 0x99f6e4
  },
  ui: BODY_UI.sql,
  master: "Мастер запросов",
  stages: [
    "Тяжёлая серая бочка, данные спят.",
    "Кольца и строки загораются бирюзой.",
    "Бронзовые обручи, ключ PRIMARY KEY, щит-индекс.",
    "Парит; вокруг SELECT, JOIN, WHERE; корона из бочек.",
    "Из ядра бьёт столб света, связи горят."
  ],
  orbit: ["SELECT", "JOIN", "WHERE", "INDEX", "KEY", "GROUP"],
  build(K: Kit, body: THREE.Group) {
    for (const side of [-1, 1]) {
      const leg = K.group(side * 0.42, 0.5, 0, body);
      K.box(0.46, 0.42, 0.5, K.m.stone, 0, -0.2, 0, leg);
      K.box(0.56, 0.12, 0.64, K.m.stone, 0, -0.44, 0.06, leg);
      K.gear(K.box(0.6, 0.24, 0.6, K.m.trim, 0, -0.24, 0, leg), 42, 52);
    }
    const torso = K.group(0, 1.35, 0, body);
    K.cyl(0.95, 0.95, 1.35, 12, K.m.stone, 0, 0, 0, torso);
    for (const y of [0.5, 0.05, -0.4])
      K.torus(0.96, 0.045, K.m.seam, 0, y, 0, torso).rotation.x = Math.PI / 2;
    const rows = [0, 1, 2, 3].map((i) =>
      K.box(0.8, 0.06, 0.02, K.m.glow, 0, 0.36 - i * 0.18, 0.95, torso)
    );
    K.gear(K.cyl(1.02, 1.02, 0.18, 12, K.m.trim, 0, 0.55, 0, torso), 40, 48);
    K.gear(K.cyl(1.02, 1.02, 0.16, 12, K.m.trim, 0, -0.55, 0, torso), 42, 50);
    const head = K.group(0, 2.3, 0, body);
    K.cyl(0.45, 0.45, 0.55, 12, K.m.stone, 0, 0, 0, head);
    K.box(0.66, 0.16, 0.14, K.m.plate, 0, 0.04, 0.4, head);
    K.box(0.14, 0.06, 0.04, K.m.glow, -0.16, 0.04, 0.48, head);
    K.box(0.14, 0.06, 0.04, K.m.glow, 0.16, 0.04, 0.48, head);
    const deadEye = K.box(
      0.14,
      0.06,
      0.045,
      K.m.crack,
      -0.16,
      0.04,
      0.48,
      head
    );
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 1.12, 1.75, 0, body);
      K.box(0.4, 0.7, 0.44, K.m.stone, 0, -0.32, 0, arm);
      K.box(0.48, 0.36, 0.5, K.m.stone, 0, -0.8, 0.02, arm);
      K.gear(K.cyl(0.38, 0.38, 0.22, 10, K.m.trim, 0, 0.05, 0, arm), 40, 48);
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    const key = K.gear(K.group(0, -0.95, 0.25, armR), 42, 52);
    K.box(0.08, 1.0, 0.08, K.m.trim, 0, 0.3, 0, key);
    K.torus(0.16, 0.05, K.m.trim, 0, 0.9, 0, key, 12);
    K.box(0.22, 0.06, 0.08, K.m.trim, 0.1, -0.1, 0, key);
    K.box(0.14, 0.06, 0.08, K.m.trim, 0.07, 0.05, 0, key);
    K.gear(K.box(0.62, 0.44, 0.06, K.m.plate, 0, -0.6, 0.3, armL), 44, 54);
    for (let i = 0; i < 3; i++)
      K.gear(
        K.box(0.5, 0.03, 0.02, K.m.hot, 0, -0.5 - i * 0.1, 0.34, armL),
        46,
        56
      );
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.25, 2.6, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: K.pal.aura,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false
      })
    );
    column.position.y = 3.9;
    body.add(column);
    return {
      torso,
      head,
      armL,
      armR,
      deadEye,
      core: null,
      headY: 2.3,
      rows,
      column,
      seamsEarly: true
    };
  },
  crest(K, g) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      K.cyl(
        0.08,
        0.08,
        0.16,
        8,
        K.m.hot,
        Math.cos(a) * 0.32,
        0,
        Math.sin(a) * 0.32,
        g
      );
    }
    return null;
  },
  wing(K, side, p) {
    for (let k = 0; k < 3; k++) {
      const f = K.group(side * (0.6 + k * 0.42), 0.2 - k * 0.25, -0.1, p);
      K.box(0.36, 0.26, 0.04, K.m.hot, 0, 0, 0, f);
      K.box(0.3, 0.02, 0.05, K.m.plate, 0, 0.04, 0.01, f);
      K.box(0.3, 0.02, 0.05, K.m.plate, 0, -0.04, 0.01, f);
      if (k) K.bar(0.36, -side * 0.24, 0.12, side * 0.6, f, K.m.hot, 0.03);
    }
  }
};
