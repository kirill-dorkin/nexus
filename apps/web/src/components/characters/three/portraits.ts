import * as THREE from "three";
import { buildFigure } from "./figure";
import { characterDef } from "./roster";

/*
 * Still portraits for the roster cards. Six live scenes on one page would drain a cheap
 * phone, so one short-lived renderer draws every character once, at the learner's level
 * and in its own colours, and hands back images; then it releases the GPU.
 */

export type PortraitRequest = { slug: string; level: number };

export function renderPortraits(
  requests: readonly PortraitRequest[],
  size = 360
): Record<string, string> {
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(size, size, false);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(2.4, 3, 10.5);
  camera.lookAt(0, 2, 0);
  const out: Record<string, string> = {};
  try {
    for (const { slug, level } of requests) {
      const def = characterDef(slug);
      if (!def) continue;
      const scene = new THREE.Scene();
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(3, 5, 4);
      const rim = new THREE.PointLight(def.pal.glow, 0, 14);
      rim.position.set(-2.2, 3, -2.4);
      const rim2 = new THREE.PointLight(def.pal.aura, 0, 14);
      rim2.position.set(2.4, 2, -2);
      scene.add(
        new THREE.HemisphereLight(0xfff4ea, 0x120c08, 0.5),
        key,
        rim,
        rim2
      );
      const figure = buildFigure(def);
      const glow = figure.look(level);
      figure.animate(1.2, 1, glow);
      figure.root.rotation.y = -0.45;
      rim.intensity = 1.5 + 3 * glow.r3 + 2.5 * glow.r5;
      rim2.intensity = 1 + 2 * glow.r4 + 2 * glow.r5;
      scene.add(figure.root);
      renderer.render(scene, camera);
      out[slug] = canvas.toDataURL("image/png");
      figure.dispose();
    }
  } finally {
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return out;
}
