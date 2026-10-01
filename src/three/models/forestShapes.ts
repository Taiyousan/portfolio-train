import * as THREE from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FLOWER_COLORS, STATION_COLORS } from "./StationPrimitives";

// The forest's props (see Forest), in the rounded cartoon style of the
// station and the home: each one a single geometry, its parts merged with
// their colours (see shaders/forestMaterial), so a whole kind draws in one
// call per tile. Tinted parts are a shade of grey, from 1 at the top of a
// crown to a little darker under it: their instance's colour comes on top.
// In world units, standing on y = 0, centred on the origin.

export const FOREST_COLORS = {
  bark: "#6b4a32",
  birch: "#ebe5d6",
  birchMark: "#3b3530",
  cut: "#d4a56f",
  stem: STATION_COLORS.bush,
  leaf: STATION_COLORS.bushLight,
  moss: "#6f9a45",
  cap: "#d0473a",
  capDot: "#fff3e0",
  capStem: STATION_COLORS.sign,
  reedHead: "#7a5034",
  lilyPad: "#4f8a3c",
  lily: "#f2b6c6",
  bank: "#6d5a3f",
  pebble: "#8f8a80",
};

type Vec3 = [number, number, number];

// Deterministic randomness, so every copy of a shape (and of a pond, from
// its seed) comes out the same.
export function seededRandom(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A part of a shape: its geometry, its colour (a grey level for tinted
// parts), and whether it takes its instance's tint.
type Part = {
  geometry: THREE.BufferGeometry;
  color: THREE.ColorRepresentation | number;
  tint?: boolean;
};

function paint({ geometry, color, tint = false }: Part) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.deleteAttribute("uv");
  const count = flat.attributes.position.count;
  const rgb =
    typeof color === "number"
      ? new THREE.Color(color, color, color)
      : new THREE.Color(color);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) rgb.toArray(colors, i * 3);
  flat.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  flat.setAttribute(
    "aTint",
    new THREE.BufferAttribute(new Float32Array(count).fill(tint ? 1 : 0), 1),
  );
  return flat;
}

// Merges painted parts into one geometry.
export function assemble(parts: Part[]) {
  const merged = mergeGeometries(parts.map(paint));
  if (!merged) throw new Error("forestShapes: parts don't match");
  return merged;
}

// ---------------------------------------------------------------- primitives

// Kept coarse throughout, smooth normals hide it: a forest has hundreds of
// these in sight.
function ball(radius: number, [x, y, z]: Vec3, scale?: Vec3, detail = 9) {
  const geometry = new THREE.SphereGeometry(
    radius,
    detail,
    Math.round(detail * 0.7),
  );
  if (scale) geometry.scale(...scale);
  geometry.translate(x, y, z);
  return geometry;
}

// A tiny bead (flower, spot): too small to need more than an icosahedron.
function bead(radius: number, [x, y, z]: Vec3, scale?: Vec3) {
  const geometry = new THREE.IcosahedronGeometry(radius, 0);
  if (scale) geometry.scale(...scale);
  geometry.translate(x, y, z);
  return geometry;
}

// Upright, from `base` up.
function post(bottom: number, top: number, height: number, base = 0) {
  const geometry = new THREE.CylinderGeometry(top, bottom, height, 8);
  geometry.translate(0, base + height / 2, 0);
  return geometry;
}

// A solid of revolution through smoothed profile points, listed from the
// bottom up (so its faces point out), the first and last on the axis.
function lathe(points: [number, number][], segments = 10) {
  const curve = new THREE.SplineCurve(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
  );
  const profile = curve.getPoints(points.length + 3);
  profile[0].x = 0;
  profile[profile.length - 1].x = 0;
  return new THREE.LatheGeometry(profile, segments);
}

// A lumpy, squashed ball with smooth normals.
export function rock(radius: number, seed: number, squash = 0.7) {
  const random = seededRandom(seed);
  const phase = [random(), random(), random()].map((p) => p * Math.PI * 2);
  const sphere = new THREE.SphereGeometry(radius, 8, 6);
  sphere.deleteAttribute("normal");
  sphere.deleteAttribute("uv");
  // Seam and pole vertices merged, so the normals come out smooth.
  const geometry = mergeVertices(sphere);
  const position = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    const n = point.clone().normalize();
    const bump =
      1 +
      0.16 * Math.sin(n.x * 3.1 + phase[0]) * Math.sin(n.y * 2.7 + phase[1]) +
      0.1 * Math.sin(n.z * 4.3 + phase[2]);
    point.multiplyScalar(bump);
    point.y *= squash;
    position.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  // Sunk a little into the ground.
  geometry.translate(0, radius * squash * 0.55, 0);
  return geometry;
}

// Crown balls: [x, y, z, radius, shade].
function crown(balls: [number, number, number, number, number][]): Part[] {
  return balls.map(([x, y, z, radius, shade]) => ({
    geometry: ball(radius, [x, y, z]),
    color: shade,
    tint: true,
  }));
}

// ---------------------------------------------------------------- trees

// One tier of a fir: a soft cone with a rounded lip curling under it.
function firTier(radius: number, height: number, base: number) {
  const tier = lathe([
    [0, -0.06 * height],
    [0.55 * radius, -0.1 * height],
    [0.93 * radius, -0.05 * height],
    [radius, 0.04 * height],
    [0.9 * radius, 0.14 * height],
    [0.62 * radius, 0.4 * height],
    [0.32 * radius, 0.7 * height],
    [0.08 * radius, 0.95 * height],
    [0, height],
  ]);
  tier.translate(0, base, 0);
  return tier;
}

function fir() {
  return assemble([
    { geometry: post(0.16, 0.1, 1.1), color: FOREST_COLORS.bark },
    { geometry: firTier(1.0, 1.5, 0.75), color: 0.8, tint: true },
    { geometry: firTier(0.78, 1.3, 1.6), color: 0.9, tint: true },
    { geometry: firTier(0.52, 1.1, 2.4), color: 1, tint: true },
  ]);
}

// A round leafy tree, its crown a cluster of balls.
function oak() {
  const branch = post(0.07, 0.05, 0.7);
  branch.rotateZ(-0.8);
  branch.translate(0.08, 1.2, 0);
  return assemble([
    { geometry: post(0.21, 0.12, 2.1), color: FOREST_COLORS.bark },
    { geometry: branch, color: FOREST_COLORS.bark },
    ...crown([
      [0, 2.45, 0, 0.95, 1],
      [0.64, 2.1, 0.25, 0.7, 0.88],
      [-0.6, 2.15, -0.25, 0.72, 0.86],
      [0.05, 2.05, 0.68, 0.62, 0.84],
      [-0.15, 2.0, -0.62, 0.6, 0.82],
      [0.15, 3.1, 0.05, 0.62, 1.04],
    ]),
  ]);
}

// A tall, slim poplar, its crown a rounded spindle.
function poplar() {
  const leaves = lathe([
    [0, 0.5],
    [0.36, 0.72],
    [0.58, 1.3],
    [0.6, 1.95],
    [0.48, 2.65],
    [0.27, 3.25],
    [0.08, 3.6],
    [0, 3.66],
  ]);
  return assemble([
    { geometry: post(0.13, 0.08, 1.0), color: FOREST_COLORS.bark },
    { geometry: leaves, color: 0.95, tint: true },
  ]);
}

// A birch: slim white trunk with dark marks, small airy crowns.
function birch() {
  const marks = [0.5, 0.9, 1.3, 1.65, 2.05].map((y, i) => {
    // The trunk's radius at that height, the marks just proud of it.
    const radius = 0.1 - (0.03 * y) / 2.7 + 0.005;
    const mark = new THREE.CylinderGeometry(
      radius,
      radius,
      0.05,
      4,
      1,
      true,
      i * 2.3,
      1.4,
    );
    mark.translate(0, y, 0);
    return { geometry: mark, color: FOREST_COLORS.birchMark };
  });
  const branch = post(0.04, 0.03, 0.55);
  branch.rotateZ(0.9);
  branch.translate(-0.05, 1.75, 0);
  return assemble([
    { geometry: post(0.1, 0.07, 2.7), color: FOREST_COLORS.birch },
    { geometry: branch, color: FOREST_COLORS.birch },
    ...marks,
    ...crown([
      [0.1, 2.75, 0.05, 0.6, 1],
      [-0.4, 2.35, 0.15, 0.48, 0.88],
      [0.36, 2.3, -0.2, 0.46, 0.86],
      [-0.05, 3.22, -0.1, 0.42, 1.04],
    ]),
  ]);
}

// ---------------------------------------------------------------- bushes

const BUSH_BALLS: [number, number, number, number, number][] = [
  [0, 0.34, 0, 0.46, 1],
  [0.38, 0.26, 0.12, 0.34, 0.9],
  [-0.34, 0.26, -0.08, 0.36, 0.9],
  [0.06, 0.24, -0.36, 0.3, 0.86],
  [-0.08, 0.24, 0.36, 0.3, 0.88],
];

function bush() {
  return assemble(crown(BUSH_BALLS));
}

// Flowers dotted over a bush's top, apart from it (see Forest), so they
// can wither in winter while the bush stays.
function bushFlowers() {
  const random = seededRandom(7);
  const flowers = Array.from({ length: 16 }, (_, i) => {
    const [x, y, z, radius] = BUSH_BALLS[i % 3];
    const angle = random() * Math.PI * 2;
    const rise = 0.25 + random() * 1.1;
    const dir = new THREE.Vector3(
      Math.cos(angle) * Math.cos(rise),
      Math.sin(rise),
      Math.sin(angle) * Math.cos(rise),
    );
    return {
      geometry: bead(0.065, [
        x + dir.x * radius,
        y + dir.y * radius,
        z + dir.z * radius,
      ]),
      color: FLOWER_COLORS[i % FLOWER_COLORS.length],
    };
  });
  return assemble(flowers);
}

// ---------------------------------------------------------------- rocks

function boulder() {
  return assemble([{ geometry: rock(0.5, 3, 0.72), color: 1, tint: true }]);
}

function mossyRock() {
  const moss = rock(0.36, 5, 0.4);
  moss.translate(0.04, 0.32, -0.02);
  return assemble([
    { geometry: rock(0.45, 11, 0.85), color: 1, tint: true },
    { geometry: moss, color: FOREST_COLORS.moss },
  ]);
}

function rockPile() {
  const pieces: [number, number, Vec3][] = [
    [0.32, 21, [0, 0, 0]],
    [0.22, 22, [0.38, 0, 0.12]],
    [0.17, 23, [-0.22, 0, 0.32]],
  ];
  return assemble(
    pieces.map(([radius, seed, [x, y, z]], i) => {
      const geometry = rock(radius, seed);
      geometry.translate(x, y, z);
      return { geometry, color: 1 - i * 0.06, tint: true };
    }),
  );
}

// ---------------------------------------------------------------- details

// A tuft of leaning blades.
function grass() {
  const random = seededRandom(31);
  return assemble(
    Array.from({ length: 9 }, (_, i) => {
      const height = 0.22 + random() * 0.16;
      const blade = new THREE.ConeGeometry(0.03, height, 5);
      blade.translate(0, height / 2, 0);
      blade.rotateZ(0.15 + random() * 0.35);
      const angle = (i / 9) * Math.PI * 2 + random() * 0.4;
      blade.rotateY(angle);
      blade.translate(Math.cos(angle) * 0.05, 0, -Math.sin(angle) * 0.05);
      return { geometry: blade, color: 0.85 + random() * 0.15, tint: true };
    }),
  );
}

// A few flowers on their stems, with leaves at their feet.
function flowers() {
  const random = seededRandom(41);
  const parts: Part[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + random();
    const distance = 0.05 + random() * 0.1;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const height = 0.16 + random() * 0.14;
    const stem = post(0.013, 0.01, height);
    stem.translate(x, 0, z);
    const color = FLOWER_COLORS[(i * 3) % FLOWER_COLORS.length];
    parts.push(
      { geometry: stem, color: FOREST_COLORS.stem },
      { geometry: ball(0.055, [x, height, z], [1, 0.6, 1], 7), color },
      {
        geometry: bead(0.022, [x, height + 0.03, z]),
        color: color === FLOWER_COLORS[1] ? FLOWER_COLORS[3] : FLOWER_COLORS[1],
      },
    );
  }
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const leaf = ball(0.08, [0, 0.025, 0], [1.6, 0.35, 0.7], 6);
    leaf.translate(0.07, 0, 0);
    leaf.rotateY(angle);
    parts.push({ geometry: leaf, color: FOREST_COLORS.leaf });
  }
  return assemble(parts);
}

// Three red, white-spotted toadstools.
function mushrooms() {
  const parts: Part[] = [];
  const spots: [number, number][] = [
    [0, 0.55],
    [1.6, 0.75],
    [3.2, 0.5],
    [4.6, 0.8],
  ];
  const caps: [number, number, number][] = [
    [0, 0, 1],
    [0.13, 0.07, 0.72],
    [-0.09, 0.11, 0.5],
  ];
  for (const [x, z, s] of caps) {
    const stemHeight = 0.13 * s;
    const radius = 0.095 * s;
    const stem = post(0.042 * s, 0.032 * s, stemHeight);
    stem.translate(x, 0, z);
    const cap = new THREE.SphereGeometry(
      radius,
      10,
      4,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    );
    cap.scale(1, 0.75, 1);
    cap.translate(x, stemHeight - 0.01 * s, z);
    const under = new THREE.CircleGeometry(radius * 0.98, 10);
    under.rotateX(Math.PI / 2);
    under.translate(x, stemHeight - 0.01 * s, z);
    parts.push(
      { geometry: stem, color: FOREST_COLORS.capStem },
      { geometry: cap, color: FOREST_COLORS.cap },
      { geometry: under, color: FOREST_COLORS.capStem },
    );
    for (const [angle, rise] of spots) {
      parts.push({
        geometry: bead(0.016 * s, [
          x + Math.cos(angle) * Math.cos(rise) * radius,
          stemHeight - 0.01 * s + Math.sin(rise) * radius * 0.75,
          z + Math.sin(angle) * Math.cos(rise) * radius,
        ]),
        color: FOREST_COLORS.capDot,
      });
    }
  }
  return assemble(parts);
}

function stump() {
  const roots = Array.from({ length: 4 }, (_, i) => {
    const root = ball(0.12, [0.24, 0.05, 0], [1.5, 0.55, 0.75], 6);
    root.rotateY((i / 4) * Math.PI * 2 + 0.4);
    return { geometry: root, color: FOREST_COLORS.bark };
  });
  return assemble([
    { geometry: post(0.3, 0.25, 0.32), color: FOREST_COLORS.bark },
    { geometry: post(0.215, 0.215, 0.025, 0.31), color: FOREST_COLORS.cut },
    ...roots,
  ]);
}

// A fallen log, with a broken-off branch.
function log() {
  const trunk = new THREE.CylinderGeometry(0.15, 0.15, 1.3, 12);
  trunk.rotateZ(Math.PI / 2);
  trunk.translate(0, 0.14, 0);
  const ends = [-1, 1].map((side) => {
    const end = new THREE.CylinderGeometry(0.125, 0.125, 0.02, 12);
    end.rotateZ(Math.PI / 2);
    end.translate(side * 0.655, 0.14, 0);
    return { geometry: end, color: FOREST_COLORS.cut };
  });
  const branch = post(0.05, 0.035, 0.22);
  branch.rotateX(-0.7);
  branch.translate(0.25, 0.2, 0.08);
  return assemble([
    { geometry: trunk, color: FOREST_COLORS.bark },
    { geometry: branch, color: FOREST_COLORS.bark },
    ...ends,
  ]);
}

export const FOREST_SHAPES = {
  fir,
  oak,
  poplar,
  birch,
  bush,
  bushFlowers,
  boulder,
  mossyRock,
  rockPile,
  grass,
  flowers,
  mushrooms,
  stump,
  log,
};

export type ForestShape = keyof typeof FOREST_SHAPES;
