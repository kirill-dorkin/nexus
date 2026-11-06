import * as THREE from "three";
import { makeKit, type Kit } from "./kit";
import type { CharacterDef, Parts } from "./types";

/*
 * One assembled character: its body, the orbiting subject tokens, the crest and the wings,
 * with the look driven by a level from 0 to 100. Rendering lives in stage.ts; this file only
 * builds and poses meshes, so it runs (and is tested) without WebGL.
 */

export type Glow = {
  /** 0–1 per rank step: awake (2), armoured (3), master (4), legendary (5). */
  r2: number;
  r3: number;
  r4: number;
  r5: number;
  /** Height above the ground. */
  hover: number;
};

export type Figure = {
  def: CharacterDef;
  root: THREE.Group;
  parts: Parts;
  kit: Kit;
  /** Applies the look for a level (0–100) and returns the rank factors for the scene lights. */
  look(level: number): Glow;
  /** Idle motion; `motion` is 0 with reduced motion. */
  animate(t: number, motion: number, glow: Glow): void;
  dispose(): void;
};

const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const step = (level: number, from: number, to: number) =>
  clamp((level - from) / (to - from));
const GREY = new THREE.Color(0x55524f);
const CRACK = new THREE.Color(0x1b1714);

export function buildFigure(def: CharacterDef): Figure {
  const kit = makeKit(def.pal);
  const root = new THREE.Group();
  const body = kit.group(0, 0, 0, root);
  const parts = def.build(kit, body);
  const orbit = kit.group(0, 1.7, 0, root);
  const tokens = def.orbit.map((text, i) => {
    const slab = kit.slab(text);
    orbit.add(slab);
    return {
      slab,
      phase: (i / def.orbit.length) * Math.PI * 2,
      tilt: i % 2 ? 0.35 : -0.25
    };
  });
  orbit.scale.setScalar(0.001);
  const crest = kit.group(0, 0, 0, root);
  const crestSpin = def.crest(kit, crest);
  crest.scale.setScalar(0.001);
  const wings = ([-1, 1] as const).map((side) => {
    const pivot = kit.group(side * 0.35, 2.05, -0.55, body);
    def.wing(kit, side, pivot);
    pivot.scale.setScalar(0.001);
    return { pivot, side };
  });
  const tint = new THREE.Color();
  const { m, pal } = kit;

  function look(level: number): Glow {
    const r2 = step(level, 18, 28),
      r3 = step(level, 38, 50),
      r4 = step(level, 58, 70),
      r5 = step(level, 78, 92);
    body.scale.setScalar(0.8 + 0.12 * r2 + 0.14 * r3 + 0.04 * r4 + 0.06 * r5);
    parts.torso.rotation.x = 0.28 * (1 - r2);
    parts.head.position.z = 0.2 * (1 - r2);
    parts.armL.rotation.z = -0.06 - 0.25 * r5;
    parts.armR.rotation.z = 0.06 + 0.25 * r5;
    m.stone.color.copy(GREY).lerp(tint.setHex(pal.base), r2);
    m.stone.emissive.setHex(pal.glow).multiplyScalar(r5 * 0.06);
    m.plate.emissive.setHex(pal.glow).multiplyScalar(r5 * 0.08);
    m.trim.emissive.setHex(pal.trim).multiplyScalar(r4 * 0.3);
    m.crack.color.copy(CRACK).lerp(tint.setHex(pal.glow), r2);
    m.glow.emissiveIntensity = 0.5 + 1.8 * r2 + 1.4 * r5;
    parts.deadEye.visible = r2 < 0.5;
    parts.core?.scale.setScalar(0.6 + 0.6 * r2 + 0.4 * r5);
    for (const [piece, from, to] of kit.grow)
      piece.scale.setScalar(Math.max(0.001, step(level, from, to)));
    m.seam.opacity = parts.seamsEarly ? 0.1 + 0.85 * r2 : r4 * 0.95;
    orbit.scale.setScalar(Math.max(0.001, r4));
    crest.scale.setScalar(Math.max(0.001, step(level, 62, 70)));
    for (const w of wings) w.pivot.scale.setScalar(Math.max(0.001, r5));
    if (parts.column)
      (parts.column.material as THREE.MeshBasicMaterial).opacity = 0.18 * r5;
    if (parts.paint) parts.paint.material = r2 > 0.5 ? m.hot : m.stone;
    const hover = (parts.floats ?? 0) + 0.18 * r4 + 0.22 * r5;
    return { r2, r3, r4, r5, hover };
  }

  function animate(t: number, motion: number, glow: Glow) {
    const awake = glow.r2 > 0.5 ? 1 : 0.15;
    root.position.y =
      glow.hover + Math.sin(t * 1.6) * (0.04 + glow.hover * 0.2) * motion;
    parts.torso.scale.y = 1 + Math.sin(t * 1.6) * 0.012 * motion;
    parts.head.rotation.y = Math.sin(t * 0.7) * 0.18 * motion;
    parts.armL.rotation.x = Math.sin(t * 1.6) * 0.08 * motion;
    parts.armR.rotation.x = -Math.sin(t * 1.6) * 0.08 * motion;
    if (parts.core) parts.core.rotation.y = t * 1.4 * motion;
    for (const w of parts.wheels ?? []) w.rotation.x = t * 2 * awake * motion;
    for (const [i, s] of (parts.spinners ?? []).entries())
      s.rotation.z = t * (i ? -2 : 1.2) * awake * motion;
    for (const [i, s] of (parts.springs ?? []).entries())
      s.scale.y = 1 + Math.sin(t * 3.2 + i) * 0.15 * motion;
    for (const [i, f] of (parts.swayers ?? []).entries())
      f.rotation.y = Math.sin(t * 0.8 + i) * 0.25 * motion;
    if (parts.globe) parts.globe.rotation.y = t * (0.2 + glow.r2) * motion;
    if (parts.needle)
      parts.needle.rotation.z = Math.sin(t * 1.3) * 0.8 * motion;
    for (const [i, row] of (parts.rows ?? []).entries())
      row.visible = glow.r2 < 0.5 ? i === 0 : (t * 2 + i) % 4 < 3.4;
    orbit.rotation.y = t * 0.5 * motion;
    for (const [i, token] of tokens.entries()) {
      const a = token.phase + t * 0.3 * motion;
      token.slab.position.set(
        Math.cos(a) * 1.8,
        Math.sin(a * 2 + i) * 0.35 + token.tilt,
        Math.sin(a) * 1.8
      );
      token.slab.lookAt(0, token.slab.position.y, 0);
      token.slab.rotation.y += Math.PI;
    }
    crest.position.set(
      0,
      (parts.headY + 0.95) * body.scale.y +
        glow.hover +
        Math.sin(t * 2) * 0.08 * motion,
      0
    );
    crest.rotation.y = t * 0.9 * motion;
    if (crestSpin) crestSpin.rotation.z = t * 6 * motion;
    for (const w of wings)
      w.pivot.rotation.y = w.side * (0.45 + Math.sin(t * 1.8) * 0.18 * motion);
  }

  function dispose() {
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mesh = o as THREE.Mesh;
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const mat of mats) mat.dispose();
    });
  }

  return { def, root, parts, kit, look, animate, dispose };
}

/** The point on the character the flame and the head sparks rise from. */
export const headTop = (figure: Figure, hover: number) =>
  (figure.parts.headY + 0.45) * (figure.root.children[0]?.scale.y ?? 1) + hover;
