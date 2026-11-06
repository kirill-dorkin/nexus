import type * as THREE from "three";
import { cracks, type Kit } from "./kit";
import type { CharacterDef } from "./types";

/** Браузер: no legs, a long coat, a big globe head, a compass and a staff; navy, brass, sky light. */
export const browser: CharacterDef = {
  slug: "browser",
  pal: {
    base: 0x1f4fa0,
    plate: 0x111f36,
    trim: 0xd9a441,
    glow: 0x5aa9ff,
    aura: 0xa8d4ff
  },
  ui: ["#5aa9ff", "#bfdbfe", "#1e3a8a", "#0b1a3a"],
  master: "Мастер протоколов",
  stages: [
    "Путник в пыльном плаще, глобус погас.",
    "Глобус светится синим, загорается визор-адресная строка.",
    "Латунные наплечники-вкладки, щит-компас, посох.",
    "Взлетает; вокруг 200, 301, 404; над головой фонарь DNS.",
    "Крылья из вкладок, меридианы горят."
  ],
  orbit: ["200", "301", "404", "DNS", "HTTPS", "URL"],
  build(K: Kit, body: THREE.Group) {
    K.cyl(0.45, 0.85, 1.3, 8, K.m.stone, 0, 0.7, 0, body);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const hem = K.box(
        0.26,
        0.2,
        0.06,
        i % 2 ? K.m.trim : K.m.plate,
        Math.sin(a) * 0.8,
        0.14,
        Math.cos(a) * 0.8,
        body
      );
      hem.rotation.y = a;
      K.gear(hem, 42 + i, 52 + i);
    }
    const torso = K.group(0, 1.65, 0, body);
    K.box(1.0, 0.75, 0.6, K.m.stone, 0, 0, 0, torso);
    cracks(K, torso, 0.31, 0.8);
    const core = K.ico(0.13, K.m.glow, 0, 0, 0.32, torso, 0);
    K.gear(K.box(0.86, 0.12, 0.66, K.m.trim, 0, -0.32, 0, torso), 44, 54);
    K.box(0.03, 0.75, 0.64, K.m.seam, 0, 0, 0, torso);
    K.box(1.04, 0.03, 0.64, K.m.seam, 0, 0.2, 0, torso);
    const head = K.group(0, 2.55, 0, body);
    const globe = K.ico(0.58, K.m.stone, 0, 0.05, 0, head, 1);
    K.torus(0.6, 0.03, K.m.seam, 0, 0.05, 0, head, 32).rotation.y = Math.PI / 2;
    K.torus(0.6, 0.03, K.m.seam, 0, 0.05, 0, head, 32).rotation.x = Math.PI / 2;
    K.box(0.8, 0.14, 0.14, K.m.plate, 0, 0.08, 0.5, head);
    K.box(0.2, 0.06, 0.04, K.m.glow, -0.18, 0.08, 0.58, head);
    K.box(0.2, 0.06, 0.04, K.m.glow, 0.18, 0.08, 0.58, head);
    const deadEye = K.box(0.2, 0.06, 0.045, K.m.crack, -0.18, 0.08, 0.58, head);
    const arms = ([-1, 1] as const).map((side) => {
      const arm = K.group(side * 0.66, 1.9, 0, body);
      K.box(0.26, 0.7, 0.28, K.m.stone, 0, -0.36, 0, arm);
      K.box(0.3, 0.26, 0.3, K.m.plate, 0, -0.8, 0, arm);
      for (let i = 0; i < 3; i++)
        K.gear(
          K.box(
            0.2,
            0.14,
            0.5,
            i % 2 ? K.m.trim : K.m.plate,
            -0.18 + i * 0.18,
            0.1,
            0,
            arm
          ),
          40 + i * 2,
          50 + i * 2
        );
      return arm;
    });
    const [armL, armR] = arms as [THREE.Group, THREE.Group];
    K.gear(
      K.cyl(0.38, 0.38, 0.08, 16, K.m.trim, 0, -0.6, 0.3, armL),
      42,
      52
    ).rotation.x = Math.PI / 2;
    const needle = K.gear(
      K.box(0.06, 0.5, 0.04, K.m.hot, 0, -0.6, 0.36, armL),
      46,
      56
    );
    const staff = K.gear(K.group(0, -0.85, 0.15, armR), 40, 50);
    K.cyl(0.04, 0.04, 2.2, 6, K.m.trim, 0, 0.4, 0, staff);
    K.box(0.22, 0.22, 0.22, K.m.hot, 0, 1.55, 0, staff);
    return {
      torso,
      head,
      armL,
      armR,
      deadEye,
      core,
      headY: 2.55,
      globe,
      needle,
      floats: 0.12
    };
  },
  crest(K, g) {
    K.box(0.22, 0.22, 0.22, K.m.hot, 0, 0, 0, g);
    for (const [x, z] of [
      [-0.16, -0.16],
      [0.16, -0.16],
      [-0.16, 0.16],
      [0.16, 0.16]
    ] as const)
      K.box(0.03, 0.4, 0.03, K.m.trim, x, 0, z, g);
    K.cone(0.24, 0.16, 4, K.m.trim, 0, 0.26, 0, g).rotation.y = Math.PI / 4;
    return null;
  },
  wing(K, side, p) {
    for (let k = 0; k < 4; k++) {
      const f = K.group(
        side * (0.35 + k * 0.32),
        0.15 - k * 0.12,
        -k * 0.06,
        p
      );
      const tilt = side * (0.35 - k * 0.12);
      K.box(0.44, 0.3, 0.04, K.m.hot, 0, 0, 0, f).rotation.z = tilt;
      K.box(0.38, 0.06, 0.05, K.m.trim, 0, 0.1, 0.01, f).rotation.z = tilt;
    }
  }
};
