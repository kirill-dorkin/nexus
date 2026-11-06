import * as THREE from "three";
import { buildFigure, headTop, type Figure } from "./figure";
import { canvasTexture } from "./kit";
import { characterDef } from "./roster";

/*
 * The live character scene on a character's page: one WebGL renderer, warm key light and
 * rim lights in the character's colours, a glowing ground ring, a sparks aura, idle motion
 * and drag to rotate. It pauses while off screen or in a background tab to save battery.
 * Budget (character-forge skill): pixel ratio ≤ 2, ≤ 400 particles, no shadow maps.
 */

export type Stage = {
  show(slug: string): boolean;
  setLevel(level: number): void;
  dispose(): void;
};

const SPARKS = 360;

function radial(size: number, stops: readonly (readonly [number, string])[]) {
  return canvasTexture(size, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    for (const [at, colour] of stops) r.addColorStop(at, colour);
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
}

export function createStage(host: HTMLElement, reducedMotion: boolean): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.prepend(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = renderer.domElement.style.height = "100%";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  const hemi = new THREE.HemisphereLight(0xfff4ea, 0x120c08, 0.45);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 5, 4);
  const rim = new THREE.PointLight(0xffffff, 0, 14);
  rim.position.set(-2.2, 3, -2.4);
  const rim2 = new THREE.PointLight(0xffffff, 0, 14);
  rim2.position.set(2.4, 2, -2);
  const coreLight = new THREE.PointLight(0xffffff, 0, 5);
  scene.add(hemi, key, rim, rim2, coreLight);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f0d0c, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  const ringMat = new THREE.MeshBasicMaterial({
    map: radial(256, [
      [0, "rgba(255,255,255,0)"],
      [0.62, "rgba(255,255,255,0.05)"],
      [0.8, "rgba(255,255,255,0.9)"],
      [0.86, "rgba(255,255,255,0.25)"],
      [1, "rgba(0,0,0,0)"]
    ]),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0
  });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  scene.add(ground, ring, shadow);

  const positions = new Float32Array(SPARKS * 3);
  const seeds = Float32Array.from({ length: SPARKS }, () => Math.random());
  const sparkGeo = new THREE.BufferGeometry();
  const sparkAttr = new THREE.BufferAttribute(positions, 3);
  sparkGeo.setAttribute("position", sparkAttr);
  const sparkMat = new THREE.PointsMaterial({
    size: 0.17,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
    map: radial(64, [
      [0, "rgba(255,255,255,1)"],
      [0.35, "rgba(255,255,255,0.7)"],
      [1, "rgba(255,255,255,0)"]
    ])
  });
  scene.add(new THREE.Points(sparkGeo, sparkMat));

  let figure: Figure | null = null;
  let target = 0,
    shown = 0,
    yaw = -0.4,
    spin = 0,
    dragging = false,
    lastX = 0;
  const motion = reducedMotion ? 0 : 1;

  function show(slug: string) {
    const def = characterDef(slug);
    if (!def) return false;
    if (figure) {
      scene.remove(figure.root);
      figure.dispose();
    }
    figure = buildFigure(def);
    scene.add(figure.root);
    rim.color.setHex(def.pal.glow);
    coreLight.color.setHex(def.pal.glow);
    rim2.color.setHex(def.pal.aura);
    ringMat.color.setHex(def.pal.glow);
    sparkMat.color.setHex(def.pal.aura);
    scene.fog = new THREE.Fog(
      new THREE.Color(def.pal.glow).multiplyScalar(0.07).getHex(),
      10,
      20
    );
    shown = target;
    return true;
  }

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    host.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    yaw += dx * 0.01;
    spin = dx * 0.01;
  };
  const onUp = () => (dragging = false);
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);

  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 2.9, w < 520 ? 13.6 : 11.8);
    camera.lookAt(0, 2.2, 0);
    camera.updateProjectionMatrix();
  };
  const resizer = new ResizeObserver(resize);
  resizer.observe(host);
  resize();

  let visible = true,
    frame = 0;
  const watcher = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible && !frame) frame = requestAnimationFrame(tick);
  });
  watcher.observe(host);
  const clock = new THREE.Clock();

  function sparks(t: number, r5: number, hover: number) {
    if (!figure) return;
    const top = headTop(figure, hover);
    for (let i = 0; i < SPARKS; i++) {
      const seed = seeds[i] ?? 0;
      const k = (seed + t * (0.18 + seed * 0.25)) % 1;
      const fire = i < SPARKS * 0.3 * r5;
      const a = fire ? seed * 50 : seed * 40 + t * 0.6;
      const r = fire
        ? (0.35 - k * 0.3) * (0.6 + 0.4 * Math.sin(seed * 31))
        : 0.8 + 0.6 * Math.sin(seed * 17) ** 2 + k * 0.3;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = fire ? top + k * 1.1 : 0.1 + k * 4;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    sparkAttr.needsUpdate = true;
  }

  function tick() {
    frame = 0;
    if (!visible || document.hidden || !figure) return;
    const t = clock.getElapsedTime();
    shown += (target - shown) * 0.08;
    const glow = figure.look(shown);
    figure.animate(t, motion, glow);
    if (!dragging) {
      yaw += spin;
      spin *= 0.94;
      if (Math.abs(spin) < 0.0005) yaw += 0.0025 * motion;
    }
    figure.root.rotation.y = yaw;
    sparkMat.opacity = Math.max(glow.r5, 0.35 * glow.r4);
    if (sparkMat.opacity > 0.01) sparks(t, glow.r5, glow.hover);
    coreLight.intensity = 0.3 + 2 * glow.r2 + 2 * glow.r5;
    rim.intensity = 1.5 * glow.r2 + 3 * glow.r3 + 2.5 * glow.r5;
    rim2.intensity = 2 * glow.r4 + 2 * glow.r5;
    ringMat.opacity =
      (0.05 + 0.35 * glow.r2 + 0.6 * glow.r4) *
      (shown > 80 ? 0.8 + 0.2 * Math.sin(t * 3) * motion : 1);
    shadow.scale.setScalar(1.15 - 0.35 * (glow.hover / 0.5));
    shadowMat.opacity = 0.55 - glow.hover * 0.8;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }
  const wake = () => {
    if (!document.hidden && !frame) frame = requestAnimationFrame(tick);
  };
  document.addEventListener("visibilitychange", wake);

  return {
    show(slug) {
      const ok = show(slug);
      wake();
      return ok;
    },
    setLevel(level) {
      target = Math.max(0, Math.min(100, level));
      wake();
    },
    dispose() {
      cancelAnimationFrame(frame);
      resizer.disconnect();
      watcher.disconnect();
      document.removeEventListener("visibilitychange", wake);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      figure?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
