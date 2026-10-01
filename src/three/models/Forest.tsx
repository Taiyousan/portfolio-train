import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { useControls } from "leva";
import { RAIL_TILE_LENGTH } from "../config/worldScale";
import {
  CAMERA_POSITION,
  STATION_CAMERA,
  STOP_CLEAR_X,
  STOP_HALF_LENGTH,
  STOP_SIDE,
} from "../config/scene";
import useScrollingLoop from "../hooks/useScrollingLoop";
import { useTrainContext } from "../state/TrainContext";
import { mixColor, mixValue, useSeasonColor } from "../hooks/useSeason";
import {
  createForestMaterials,
  type ForestMaterials,
} from "../shaders/forestMaterial";
import { FOREST_SHAPES, type ForestShape } from "./forestShapes";
import Pond, { BANK, POND_RADIUS, SHORE, type PondLayout } from "./Pond";

// Matches the rails' rendered tile length so the forest scrolls in the same
// world-space units as the track, and tree distances stay relative to the
// train's actual size.
const TILE_SPACING = RAIL_TILE_LENGTH;
// The camera looks at the train from one side of the track, with forest on
// both sides of it — between the camera and the train, and behind the
// camera — for an immersive feel. Only a thin band right at the camera's
// own distance stays clear (± `clearing`), so a trunk can't spawn inside
// the camera and clip it.
// The station shot gets no such band: props near it are shrunk away while
// the train pulls in instead (see useCull).
const CAMERA_SIDE = Math.sign(CAMERA_POSITION[0]);
const CAMERA_DISTANCE = Math.abs(CAMERA_POSITION[0]);

// Each kind of prop is counted in a layer (one Leva density and spread for
// all of the layer's kinds), and takes `share` of its count: an average
// per side of the track, so rare kinds can come less than once a tile.
type Layer = "trees" | "bushes" | "rocks" | "details";

type Kind = {
  shape: ForestShape;
  // Flowers on it, a second mesh on the same spots that withers in winter
  // while the prop itself stays.
  blooms?: ForestShape;
  layer: Layer;
  share: number;
  // Nearest a prop's centre comes to the track.
  minX: number;
  // How far it reaches out from its centre at scale 1 (crown, bush...).
  reach: number;
  scale: [number, number];
  // Its tinted parts' colour, one picked per prop.
  tints: string[];
  // Flattens away under the snow (see shaders/forestMaterial).
  wither?: boolean;
  shadow?: boolean;
  // Allowed by the track on the stops' side too, where it's shrunk away
  // whenever a stop is there. Every other kind keeps clear of the stops'
  // side out to STOP_CLEAR_X.
  nearStops?: boolean;
};

const GREENS = ["#4f8a3c", "#5d9a45", "#457f3a", "#6aa04a"];
const FIR_GREENS = ["#2f6b45", "#3a7a4c", "#2b5f40", "#357048"];
const ROCK_GREYS = ["#7d786f", "#6f6c66", "#867e71", "#6c7075"];

// Stumps and logs stay past the strip between the track and the camera,
// where they'd fill the foreground: only on the stops' side, in practice.
const NEAR_CAMERA = CAMERA_DISTANCE - 2;

// One in six round trees and one in five birches already turning.
const KINDS: Kind[] = [
  {
    shape: "fir",
    layer: "trees",
    share: 0.4,
    minX: 1.5,
    reach: 1,
    scale: [0.7, 1.4],
    tints: FIR_GREENS,
    shadow: true,
  },
  {
    shape: "oak",
    layer: "trees",
    share: 0.3,
    minX: 1.8,
    reach: 1.35,
    scale: [0.7, 1.3],
    tints: [...GREENS, "#4f8a3c", "#d98a3a"],
    shadow: true,
  },
  {
    shape: "poplar",
    layer: "trees",
    share: 0.15,
    minX: 1.5,
    reach: 0.6,
    scale: [0.8, 1.4],
    tints: ["#557f37", "#4c7a3a", "#628c3c"],
    shadow: true,
  },
  {
    shape: "birch",
    layer: "trees",
    share: 0.15,
    minX: 1.5,
    reach: 0.9,
    scale: [0.8, 1.3],
    tints: ["#7fae4f", "#8db657", "#76a64c", "#7fae4f", "#e0b54a"],
    shadow: true,
  },
  {
    shape: "bush",
    layer: "bushes",
    share: 0.7,
    minX: 1,
    reach: 0.7,
    scale: [0.7, 1.4],
    tints: GREENS,
    shadow: true,
  },
  {
    shape: "bush",
    blooms: "bushFlowers",
    layer: "bushes",
    share: 0.3,
    minX: 1,
    reach: 0.7,
    scale: [0.7, 1.2],
    tints: GREENS,
    shadow: true,
  },
  {
    shape: "boulder",
    layer: "rocks",
    share: 0.45,
    minX: 1.2,
    reach: 0.55,
    scale: [0.6, 1.5],
    tints: ROCK_GREYS,
    shadow: true,
  },
  {
    shape: "mossyRock",
    layer: "rocks",
    share: 0.25,
    minX: 1.2,
    reach: 0.5,
    scale: [0.7, 1.4],
    tints: ROCK_GREYS,
    shadow: true,
  },
  {
    shape: "rockPile",
    layer: "rocks",
    share: 0.3,
    minX: 1.2,
    reach: 0.6,
    scale: [0.7, 1.3],
    tints: ROCK_GREYS,
    shadow: true,
  },
  {
    shape: "grass",
    layer: "details",
    share: 0.45,
    minX: 1.1,
    reach: 0.15,
    scale: [0.7, 1.2],
    tints: ["#6aa04a", "#78a857", "#5d9a45", "#86b05a"],
    wither: true,
    nearStops: true,
  },
  {
    shape: "flowers",
    layer: "details",
    share: 0.3,
    minX: 1.1,
    reach: 0.2,
    scale: [0.7, 1.1],
    tints: ["#ffffff"],
    wither: true,
    nearStops: true,
  },
  {
    shape: "mushrooms",
    layer: "details",
    share: 0.1,
    minX: 1.1,
    reach: 0.2,
    scale: [0.6, 1.1],
    tints: ["#ffffff"],
    wither: true,
    nearStops: true,
  },
  {
    shape: "stump",
    layer: "details",
    share: 0.08,
    minX: NEAR_CAMERA,
    reach: 0.35,
    scale: [0.7, 1.3],
    tints: ["#ffffff"],
    shadow: true,
    nearStops: true,
  },
  {
    shape: "log",
    layer: "details",
    share: 0.05,
    minX: NEAR_CAMERA,
    reach: 0.7,
    scale: [0.8, 1.2],
    tints: ["#ffffff"],
    shadow: true,
    nearStops: true,
  },
];

// How much each prop's tint varies in lightness around its palette colour.
const TINT_JITTER = 0.08;

type Placement = {
  x: number;
  z: number;
  scale: number;
  rotationY: number;
  tint: THREE.Color;
};

// Picks a random x from a list of [start, end] segments, weighted by each
// segment's length so density stays uniform across the gap.
function pickInSegments(segments: [number, number][]): number {
  const lengths = segments.map(([start, end]) => end - start);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < segments.length; i++) {
    if (roll < lengths[i]) {
      const [start] = segments[i];
      return start + roll;
    }
    roll -= lengths[i];
  }
  const [start, end] = segments[segments.length - 1];
  return end ?? start;
}

function sideSegments(
  side: number,
  kind: Kind,
  maxX: number,
  clearing: number,
): [number, number][] {
  const minX = kind.minX;
  // Keep the stops' side of the track free of props, their full width.
  if (side === STOP_SIDE) {
    if (kind.nearStops) return [[minX, maxX]];
    const start = Math.max(minX, STOP_CLEAR_X + kind.reach * kind.scale[1]);
    return start < maxX ? [[start, maxX]] : [];
  }
  if (side !== CAMERA_SIDE) return [[minX, maxX]];

  const bandStart = Math.max(minX, CAMERA_DISTANCE - clearing);
  const bandEnd = Math.min(maxX, CAMERA_DISTANCE + clearing);
  const segments: [number, number][] = [];
  if (bandStart > minX) segments.push([minX, bandStart]);
  if (bandEnd < maxX) segments.push([bandEnd, maxX]);
  return segments;
}

// Ponds' banks, which every prop keeps off.
type Obstacle = { x: number; z: number; radius: number };

// Tries a few spots for each prop, dropping it if they all land on a pond.
const PLACE_TRIES = 6;

function randomPlacements(
  kind: Kind,
  count: number,
  maxX: number,
  clearing: number,
  obstacles: Obstacle[],
): Placement[] {
  const items: Placement[] = [];
  const [minScale, maxScale] = kind.scale;
  for (let side = -1; side <= 1; side += 2) {
    const segments = sideSegments(side, kind, maxX, clearing);
    if (segments.length === 0) continue;
    // The fraction left over is a chance of one more.
    const total = Math.floor(count + Math.random());
    for (let i = 0; i < total; i++) {
      const scale = minScale + Math.random() * (maxScale - minScale);
      for (let attempt = 0; attempt < PLACE_TRIES; attempt++) {
        const x = side * pickInSegments(segments);
        const z = (Math.random() - 0.5) * TILE_SPACING;
        const blocked = obstacles.some(
          (o) =>
            Math.hypot(x - o.x, z - o.z) < o.radius + kind.reach * scale * 0.6,
        );
        if (blocked) continue;
        const tint = new THREE.Color(
          kind.tints[Math.floor(Math.random() * kind.tints.length)],
        ).multiplyScalar(1 + (Math.random() * 2 - 1) * TINT_JITTER);
        items.push({
          x,
          z,
          scale,
          rotationY: Math.random() * Math.PI * 2,
          tint,
        });
        break;
      }
    }
  }
  return items;
}

// Ponds lie by the track, on the stops' side (shrunk away under a stop in
// sight, like the details), their bank's edge at least POND_GAP from the
// track and their centre at most POND_MAX_X; kept inside their tile.
const POND_GAP = 1.3;
const POND_MAX_X = 4.8;

function pondReach(radius: number) {
  return radius * BANK * SHORE;
}

function randomPond(): PondLayout {
  const radius =
    POND_RADIUS[0] + Math.random() * (POND_RADIUS[1] - POND_RADIUS[0]);
  const reach = pondReach(radius);
  const minX = POND_GAP + reach;
  const x =
    STOP_SIDE * (minX + Math.random() * Math.max(POND_MAX_X - minX, 0));
  const z = (Math.random() - 0.5) * (TILE_SPACING - 2 * reach);
  return { x, z, radius, seed: Math.floor(Math.random() * 1e6) };
}

type Counts = Record<Layer, number>;

// A tile's ponds (maybe one) and props, kind by kind (KINDS' order).
function layoutTile(
  counts: Counts,
  spreads: Counts,
  clearing: number,
  pondChance: number,
) {
  const pond = Math.random() < pondChance ? randomPond() : null;
  const obstacles = pond
    ? [{ x: pond.x, z: pond.z, radius: pondReach(pond.radius) }]
    : [];
  const placements = KINDS.map((kind) =>
    randomPlacements(
      kind,
      counts[kind.layer] * kind.share,
      spreads[kind.layer],
      clearing,
      obstacles,
    ),
  );
  return { pond, placements };
}

// Zone in front of the station camera (x = distance from the track on the
// camera side, z = world z) where props are shrunk away while the train
// pulls in, so no trunk ends up right in front of the lens.
const CULL_MAX_X = Math.abs(STATION_CAMERA.position[0]) + 2;
const CULL_MIN_Z = -2;
const CULL_MAX_Z = 5;
const CULL_RATE = 6;

type CullRefs = {
  tileRef: RefObject<THREE.Group | null>;
  // The stops' groups (see useStopApproach), visible while in sight.
  stops: RefObject<THREE.Group | null>[];
};

// The z of each stop in sight.
function stopsInSight(stops: RefObject<THREE.Group | null>[]) {
  return stops
    .map((stop) => stop.current)
    .filter((group) => group?.visible)
    .map((group) => group!.position.z);
}

// Whether something at (x, z), reaching `reach` round, would be under one
// of these stops.
function underStop(x: number, z: number, reach: number, stopZs: number[]) {
  return (
    Math.sign(x) === STOP_SIDE &&
    Math.abs(x) < STOP_CLEAR_X + reach &&
    stopZs.some((stopZ) => Math.abs(z - stopZ) < STOP_HALF_LENGTH + reach)
  );
}

const dummy = new THREE.Object3D();

function setInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  placement: Placement,
  shrink: number,
) {
  dummy.position.set(placement.x, 0, placement.z);
  dummy.rotation.set(0, placement.rotationY, 0);
  dummy.scale.setScalar(placement.scale * shrink);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

// Shrinks away, smoothly, every prop in the station camera's zone while
// arriving at or waiting at a stop, and every prop by the track under a
// stop in sight (only nearStops kinds go there). Only rewrites the
// instances whose size is changing; idle otherwise.
function useCull(
  meshRefs: RefObject<THREE.InstancedMesh | null>[],
  kind: Kind,
  placements: Placement[],
  { tileRef, stops }: CullRefs,
) {
  const { mode } = useTrainContext();
  const stationShot = mode === "arriving" || mode === "stopped";
  const sizesRef = useRef<{ for: Placement[]; sizes: Float32Array } | null>(
    null,
  );

  useFrame((_, delta) => {
    const meshes = meshRefs
      .map((ref) => ref.current)
      .filter((mesh) => mesh !== null);
    if (meshes.length === 0) return;
    if (sizesRef.current?.for !== placements) {
      sizesRef.current = {
        for: placements,
        sizes: new Float32Array(placements.length).fill(1),
      };
    }
    const { sizes } = sizesRef.current;
    const tileZ = tileRef.current?.position.z ?? 0;
    const stopZs = stopsInSight(stops);
    let changed = false;

    placements.forEach((p, i) => {
      const z = tileZ + p.z;
      const reach = kind.reach * p.scale;
      const inShot =
        stationShot &&
        Math.sign(p.x) === CAMERA_SIDE &&
        Math.abs(p.x) < CULL_MAX_X &&
        z > CULL_MIN_Z &&
        z < CULL_MAX_Z;
      const hidden =
        inShot || (kind.nearStops && underStop(p.x, z, reach, stopZs));
      const target = hidden ? 0 : 1;
      if (sizes[i] === target) return;
      const next = THREE.MathUtils.damp(sizes[i], target, CULL_RATE, delta);
      sizes[i] = Math.abs(next - target) < 0.005 ? target : next;
      meshes.forEach((mesh) => setInstance(mesh, i, p, sizes[i]));
      changed = true;
    });
    if (!changed) return;
    meshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });
  });
}

function InstancedKind({
  kind,
  geometries,
  materials,
  placements,
  cull,
}: {
  kind: Kind;
  geometries: Record<ForestShape, THREE.BufferGeometry>;
  materials: ForestMaterials;
  placements: Placement[];
  cull: CullRefs;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const bloomsRef = useRef<THREE.InstancedMesh>(null);
  // Before the first render, so the material compiles with instance
  // colours.
  useLayoutEffect(() => {
    [ref.current, bloomsRef.current].forEach((mesh) => {
      if (!mesh) return;
      placements.forEach((p, i) => {
        setInstance(mesh, i, p, 1);
        mesh.setColorAt(i, p.tint);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [placements]);
  useCull([ref, bloomsRef], kind, placements, cull);

  return (
    <>
      <instancedMesh
        ref={ref}
        args={[
          geometries[kind.shape],
          kind.wither ? materials.withering : materials.solid,
          placements.length,
        ]}
        castShadow={kind.shadow ?? false}
        receiveShadow
        frustumCulled={false}
      />
      {kind.blooms && (
        <instancedMesh
          ref={bloomsRef}
          args={[
            geometries[kind.blooms],
            materials.withering,
            placements.length,
          ]}
          receiveShadow
          frustumCulled={false}
        />
      )}
    </>
  );
}

// A tile's pond, shrunk away under a stop in sight.
function TilePond({
  layout,
  materials,
  water,
  cull: { tileRef, stops },
}: {
  layout: PondLayout;
  materials: ForestMaterials;
  water: THREE.Material;
  cull: CullRefs;
}) {
  const ref = useRef<THREE.Group>(null);
  const sizeRef = useRef(1);
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const z = (tileRef.current?.position.z ?? 0) + layout.z;
    const hidden = underStop(
      layout.x,
      z,
      pondReach(layout.radius),
      stopsInSight(stops),
    );
    const target = hidden ? 0 : 1;
    if (sizeRef.current === target) return;
    const next = THREE.MathUtils.damp(
      sizeRef.current,
      target,
      CULL_RATE,
      delta,
    );
    sizeRef.current = Math.abs(next - target) < 0.005 ? target : next;
    group.scale.setScalar(sizeRef.current);
  });

  return (
    <group ref={ref} position={[layout.x, 0, layout.z]}>
      <Pond
        radius={layout.radius}
        seed={layout.seed}
        materials={materials}
        water={water}
      />
    </group>
  );
}

function ForestTile({
  geometries,
  materials,
  water,
  density,
  spread,
  clearing,
  pondChance,
  cull,
}: {
  geometries: Record<ForestShape, THREE.BufferGeometry>;
  materials: ForestMaterials;
  water: THREE.Material;
  density: Counts;
  spread: Counts;
  clearing: number;
  pondChance: number;
  cull: CullRefs;
}) {
  // Laid out again only when a setting changes, not on every render.
  const { trees, bushes, rocks, details } = density;
  const { trees: treeSpread, rocks: rockSpread } = spread;
  const { bushes: bushSpread, details: detailSpread } = spread;
  const layout = useMemo(
    () =>
      layoutTile(
        { trees, bushes, rocks, details },
        {
          trees: treeSpread,
          bushes: bushSpread,
          rocks: rockSpread,
          details: detailSpread,
        },
        clearing,
        pondChance,
      ),
    [
      trees,
      bushes,
      rocks,
      details,
      treeSpread,
      bushSpread,
      rockSpread,
      detailSpread,
      clearing,
      pondChance,
    ],
  );

  return (
    <>
      {KINDS.map((kind, index) => (
        <InstancedKind
          key={index}
          kind={kind}
          geometries={geometries}
          materials={materials}
          placements={layout.placements[index]}
          cull={cull}
        />
      ))}
      {layout.pond && (
        <TilePond
          layout={layout.pond}
          materials={materials}
          water={water}
          cull={cull}
        />
      )}
    </>
  );
}

// Tiles of procedural trees, bushes, rocks, small details and the odd pond
// scroll along z, looping like the rails.
export default function Forest({
  stops,
  ...props
}: ThreeElements["group"] & {
  stops: RefObject<THREE.Group | null>[];
}) {
  const geometries = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(FOREST_SHAPES).map(([shape, build]) => [shape, build()]),
      ) as Record<ForestShape, THREE.BufferGeometry>,
    [],
  );
  const materials = useMemo(() => createForestMaterials(), []);
  // Flat cartoon water, plain blue with no reflection at all: the sunset
  // environment, mirrored at grazing angles, would set it ablaze under the
  // bloom.
  const water = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ roughness: 1, envMapIntensity: 0 }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
      materials.dispose();
      water.dispose();
    },
    [geometries, materials, water],
  );

  // Season: snow on top of everything, a tint over it all, ice for water.
  const { seasonWeightsRef } = useTrainContext();
  const tint = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const weights = seasonWeightsRef.current;
    materials.setSnow(mixValue(weights, "snow"));
    materials.setTint(mixColor(weights, "forest", tint));
  });
  const waterRef = useMemo(() => ({ current: water }), [water]);
  useSeasonColor(waterRef, "water");

  const {
    tileCount,
    treesPerTile,
    treeSpread,
    bushesPerTile,
    bushSpread,
    rocksPerTile,
    rockSpread,
    detailsPerTile,
    detailSpread,
    pondChance,
    clearing,
  } = useControls("Forest", {
    tileCount: { value: 6, min: 2, max: 14, step: 1 },
    treesPerTile: { value: 32, min: 0, max: 60, step: 1 },
    treeSpread: { value: 40, min: 5, max: 80, step: 1 },
    bushesPerTile: { value: 12, min: 0, max: 60, step: 1 },
    bushSpread: { value: 30, min: 5, max: 80, step: 1 },
    rocksPerTile: { value: 14, min: 0, max: 60, step: 1 },
    rockSpread: { value: 30, min: 5, max: 80, step: 1 },
    detailsPerTile: { value: 3, min: 0, max: 100, step: 0.5 },
    detailSpread: { value: 9, min: 2, max: 30, step: 0.5 },
    pondChance: { value: 0.08, min: 0, max: 1, step: 0.01 },
    clearing: { value: 2, min: 0, max: 10, step: 0.5 },
  });

  const density: Counts = {
    trees: treesPerTile,
    bushes: bushesPerTile,
    rocks: rocksPerTile,
    details: detailsPerTile,
  };
  const spread: Counts = {
    trees: treeSpread,
    bushes: bushSpread,
    rocks: rockSpread,
    details: detailSpread,
  };

  const tiles = useScrollingLoop(tileCount, TILE_SPACING);

  return (
    <group {...props}>
      {tiles.map(({ ref, position }, index) => (
        <group key={index} ref={ref} position={position}>
          <ForestTile
            geometries={geometries}
            materials={materials}
            water={water}
            density={density}
            spread={spread}
            clearing={clearing}
            pondChance={pondChance}
            cull={{ tileRef: ref, stops }}
          />
        </group>
      ))}
    </group>
  );
}
