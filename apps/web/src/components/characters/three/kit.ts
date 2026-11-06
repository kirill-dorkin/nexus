import * as THREE from "three";

/*
 * Building blocks for the 3D code characters (character-forge skill, roster approved
 * 2026-11-06). Every character is made of boxes, cylinders, cones and rings with a few
 * shared materials, so it reads as "made of code" and stays cheap on weak phones.
 */

export type Palette = {
  /** Stone colour the body grows into from grey at rank 2. */
  base: number;
  plate: number;
  trim: number;
  /** Eyes, core, ring and rim light. */
  glow: number;
  /** Sparks and seams. */
  aura: number;
};

export type Materials = {
  stone: THREE.MeshStandardMaterial;
  plate: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
  crack: THREE.MeshBasicMaterial;
  seam: THREE.MeshBasicMaterial;
  hot: THREE.MeshStandardMaterial;
};

/** A piece that scales in from nothing between two levels. */
export type Growth = readonly [THREE.Object3D, number, number];

export type Kit = {
  m: Materials;
  pal: Palette;
  grow: Growth[];
  box(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D
  ): THREE.Mesh;
  cyl(
    rTop: number,
    rBottom: number,
    h: number,
    segments: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D
  ): THREE.Mesh;
  cone(
    r: number,
    h: number,
    segments: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D
  ): THREE.Mesh;
  torus(
    r: number,
    tube: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D,
    segments?: number
  ): THREE.Mesh;
  ico(
    r: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D,
    detail?: number
  ): THREE.Mesh;
  oct(
    r: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D
  ): THREE.Mesh;
  group(x: number, y: number, z: number, parent: THREE.Object3D): THREE.Group;
  /** Registers a piece that appears between `from` and `to` levels. */
  gear<T extends THREE.Object3D>(piece: T, from: number, to: number): T;
  /** A bar along X, rotated in the XY plane: brackets, arrows, feathers. */
  bar(
    w: number,
    x: number,
    y: number,
    rot: number,
    parent: THREE.Object3D,
    mat?: THREE.Material,
    thickness?: number
  ): THREE.Mesh;
  /** A labelled slab for the orbiting subject tokens. */
  slab(text: string): THREE.Mesh;
  /** A hollow box of 12 bars, for the CSS box-model frames. */
  frame(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    parent: THREE.Object3D,
    thickness?: number
  ): THREE.Group;
};

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** A small canvas texture; null where canvas 2D is unavailable (tests, old browsers). */
export function canvasTexture(
  size: number,
  draw: (g: CanvasRenderingContext2D, size: number) => void
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) return null;
  draw(g, size);
  return new THREE.CanvasTexture(canvas);
}

export function makeKit(pal: Palette): Kit {
  const m: Materials = {
    stone: new THREE.MeshStandardMaterial({
      color: 0x55524f,
      roughness: 0.85,
      metalness: 0.05
    }),
    plate: new THREE.MeshStandardMaterial({
      color: pal.plate,
      roughness: 0.32,
      metalness: 0.75
    }),
    trim: new THREE.MeshStandardMaterial({
      color: pal.trim,
      roughness: 0.35,
      metalness: 0.55
    }),
    glow: new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: pal.glow,
      emissiveIntensity: 0,
      roughness: 0.4
    }),
    crack: new THREE.MeshBasicMaterial({ color: 0x1b1714 }),
    seam: new THREE.MeshBasicMaterial({
      color: pal.aura,
      transparent: true,
      opacity: 0
    }),
    hot: new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: pal.glow,
      emissiveIntensity: 2.2,
      roughness: 0.3
    })
  };
  const grow: Growth[] = [];
  const place = <T extends THREE.Object3D>(
    o: T,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D
  ) => {
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material) =>
    new THREE.Mesh(geometry, mat);
  const kit: Kit = {
    m,
    pal,
    grow,
    box: (w, h, d, mat, x, y, z, p) =>
      place(mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, p),
    cyl: (rt, rb, h, seg, mat, x, y, z, p) =>
      place(mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), x, y, z, p),
    cone: (r, h, seg, mat, x, y, z, p) =>
      place(mesh(new THREE.ConeGeometry(r, h, seg), mat), x, y, z, p),
    torus: (r, t, mat, x, y, z, p, seg = 24) =>
      place(mesh(new THREE.TorusGeometry(r, t, 6, seg), mat), x, y, z, p),
    ico: (r, mat, x, y, z, p, detail = 1) =>
      place(mesh(new THREE.IcosahedronGeometry(r, detail), mat), x, y, z, p),
    oct: (r, mat, x, y, z, p) =>
      place(mesh(new THREE.OctahedronGeometry(r), mat), x, y, z, p),
    group: (x, y, z, p) => place(new THREE.Group(), x, y, z, p),
    gear(piece, from, to) {
      piece.scale.setScalar(0.001);
      grow.push([piece, from, to]);
      return piece;
    },
    bar(w, x, y, rot, p, mat = m.hot, t = 0.075) {
      const b = place(mesh(new THREE.BoxGeometry(w, t, t), mat), x, y, 0, p);
      b.rotation.z = rot;
      return b;
    },
    slab(text) {
      const tex = canvasTexture(128, (g, s) => {
        g.fillStyle = "#0e0c0b";
        g.fillRect(0, 0, s, s);
        g.strokeStyle = hex(pal.glow);
        g.lineWidth = 6;
        g.strokeRect(5, 5, s - 10, s - 10);
        g.fillStyle = "#ffffff";
        const size = text.length > 5 ? 22 : text.length > 3 ? 28 : 36;
        g.font = `700 ${size}px ui-monospace, Menlo, monospace`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(text, s / 2, s / 2 + 2);
      });
      const material = new THREE.MeshStandardMaterial({
        map: tex,
        emissive: pal.glow,
        emissiveMap: tex,
        emissiveIntensity: 0.8,
        roughness: 0.4
      });
      return mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), material);
    },
    frame(w, h, d, mat, p, t = 0.05) {
      const g = new THREE.Group();
      p.add(g);
      for (const [x, y] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1]
      ] as const) {
        kit.box(t, h, t, mat, (x * w) / 2, 0, (y * d) / 2, g);
        kit.box(w, t, t, mat, 0, (x * h) / 2, (y * d) / 2, g);
        kit.box(t, t, d, mat, (x * w) / 2, (y * h) / 2, 0, g);
      }
      return g;
    }
  };
  return kit;
}

/** Dark cracks on a front face; they light up with the character's glow from rank 2. */
export function cracks(kit: Kit, parent: THREE.Object3D, z: number, s = 1) {
  const lines = [
    [0.5, 0.035, -0.38, 0.28, 0.35],
    [0.035, 0.34, -0.15, 0.06, 0],
    [0.42, 0.035, 0.36, -0.05, -0.3],
    [0.3, 0.035, -0.36, -0.4, 0.5]
  ] as const;
  for (const [w, h, x, y, r] of lines)
    kit.box(w * s, h, 0.02, kit.m.crack, x * s, y * s, z, parent).rotation.z =
      r;
}
