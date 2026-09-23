import { useMemo, useRef, useEffect, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { useControls } from "leva";
import { RAIL_TILE_LENGTH } from "../config/worldScale";
import {
  CAMERA_POSITION,
  STATION_CAMERA,
  STATION_CLEAR_X,
  STATION_SIDE,
} from "../config/scene";
import useScrollingLoop from "../hooks/useScrollingLoop";
import { useTrainContext } from "../state/TrainContext";

// Matches the rails' rendered tile length so the forest scrolls in the same
// world-space units as the track, and tree distances stay relative to the
// train's actual size.
const TILE_SPACING = RAIL_TILE_LENGTH;
const MIN_X = { trees: 1.5, bushes: 1, rocks: 1.2 };
// The camera looks at the train from one side of the track, with forest on
// both sides of it — between the camera and the train, and behind the
// camera — for an immersive feel. Only a thin band right at the camera's
// own distance stays clear (± `clearing`), so a trunk can't spawn inside
// the camera and clip it.
// The station shot gets no such band: trees near it are shrunk away while
// the train pulls in instead (see useStationCull).
const CAMERA_SIDE = Math.sign(CAMERA_POSITION[0]);
const CAMERA_DISTANCE = Math.abs(CAMERA_POSITION[0]);

type TreeGeometries = {
  trunk: THREE.BufferGeometry;
  foliageLow: THREE.BufferGeometry;
  foliageHigh: THREE.BufferGeometry;
  bush: THREE.BufferGeometry;
  rock: THREE.BufferGeometry;
};

type Transform = { x: number; z: number; scale: number; rotationY: number };

// A stylized low-poly pine: trunk + two stacked cones.
function useTreeGeometries(): TreeGeometries {
  return useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.08, 0.14, 1.4, 6);
    trunk.translate(0, 0.7, 0);

    const foliageLow = new THREE.ConeGeometry(0.9, 1.8, 7);
    foliageLow.translate(0, 1.4 + 0.9, 0);

    const foliageHigh = new THREE.ConeGeometry(0.6, 1.4, 7);
    foliageHigh.translate(0, 1.4 + 1.6 + 0.7, 0);

    const bush = new THREE.IcosahedronGeometry(0.5, 0);
    bush.translate(0, 0.4, 0);

    const rock = new THREE.DodecahedronGeometry(0.35, 0);
    rock.translate(0, 0.18, 0);

    return { trunk, foliageLow, foliageHigh, bush, rock };
  }, []);
}

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
  minX: number,
  maxX: number,
  clearing: number,
): [number, number][] {
  // Keep the station's side of the track free of props.
  if (side === STATION_SIDE) return [[Math.max(minX, STATION_CLEAR_X), maxX]];
  if (side !== CAMERA_SIDE) return [[minX, maxX]];

  const bandStart = Math.max(minX, CAMERA_DISTANCE - clearing);
  const bandEnd = Math.min(maxX, CAMERA_DISTANCE + clearing);
  const segments: [number, number][] = [];
  if (bandStart > minX) segments.push([minX, bandStart]);
  if (bandEnd < maxX) segments.push([bandEnd, maxX]);
  return segments;
}

function randomTransforms(
  count: number,
  [minX, maxX]: [number, number],
  clearing: number,
): Transform[] {
  const items: Transform[] = [];
  for (let side = -1; side <= 1; side += 2) {
    const segments = sideSegments(side, minX, maxX, clearing);
    if (segments.length === 0) continue;
    for (let i = 0; i < count; i++) {
      items.push({
        x: side * pickInSegments(segments),
        z: (Math.random() - 0.5) * TILE_SPACING,
        scale: 0.6 + Math.random() * 0.9,
        rotationY: Math.random() * Math.PI * 2,
      });
    }
  }
  return items;
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
  factorRef: RefObject<number>;
};

// Rewrites instance matrices each frame while the cull factor (0 = none,
// 1 = full) is non-zero or has just returned to zero, scaling down every
// instance inside the zone. Idle otherwise.
function useStationCull(
  meshRefs: RefObject<THREE.InstancedMesh | null>[],
  transforms: Transform[],
  { tileRef, factorRef }: CullRefs,
) {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastFactorRef = useRef(0);

  useFrame(() => {
    const factor = factorRef.current;
    if (factor === 0 && lastFactorRef.current === 0) return;
    lastFactorRef.current = factor;
    const tileZ = tileRef.current?.position.z ?? 0;

    meshRefs.forEach((meshRef) => {
      const mesh = meshRef.current;
      if (!mesh) return;
      transforms.forEach((t, i) => {
        const inZone =
          Math.sign(t.x) === CAMERA_SIDE &&
          Math.abs(t.x) < CULL_MAX_X &&
          tileZ + t.z > CULL_MIN_Z &&
          tileZ + t.z < CULL_MAX_Z;
        dummy.position.set(t.x, 0, t.z);
        dummy.rotation.set(0, t.rotationY, 0);
        dummy.scale.setScalar(t.scale * (inZone ? 1 - factor : 1));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  });
}

function setInstanceTransforms(
  mesh: THREE.InstancedMesh | null,
  transforms: Transform[],
) {
  if (!mesh) return;
  const dummy = new THREE.Object3D();
  transforms.forEach((t, i) => {
    dummy.position.set(t.x, 0, t.z);
    dummy.rotation.set(0, t.rotationY, 0);
    dummy.scale.setScalar(t.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

// One InstancedMesh sharing a single set of transforms (bushes, rocks, ...).
function InstancedClutter({
  geometry,
  transforms,
  color,
  roughness = 0.9,
  cull,
}: {
  geometry: THREE.BufferGeometry;
  transforms: Transform[];
  color: string;
  roughness?: number;
  cull: CullRefs;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => setInstanceTransforms(ref.current, transforms), [transforms]);
  useStationCull([ref], transforms, cull);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, transforms.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      <meshStandardMaterial color={color} roughness={roughness} />
    </instancedMesh>
  );
}

// Three InstancedMeshes (trunk + two foliage cones) sharing the same transforms.
function InstancedTrees({
  geometries,
  transforms,
  cull,
}: {
  geometries: TreeGeometries;
  transforms: Transform[];
  cull: CullRefs;
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const lowRef = useRef<THREE.InstancedMesh>(null);
  const highRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    setInstanceTransforms(trunkRef.current, transforms);
    setInstanceTransforms(lowRef.current, transforms);
    setInstanceTransforms(highRef.current, transforms);
  }, [transforms]);
  useStationCull([trunkRef, lowRef, highRef], transforms, cull);

  return (
    <>
      <instancedMesh
        ref={trunkRef}
        args={[geometries.trunk, undefined, transforms.length]}
        castShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color="#4a3524" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={lowRef}
        args={[geometries.foliageLow, undefined, transforms.length]}
        castShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color="#25422b" roughness={0.8} />
      </instancedMesh>
      <instancedMesh
        ref={highRef}
        args={[geometries.foliageHigh, undefined, transforms.length]}
        castShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color="#2f4f35" roughness={0.8} />
      </instancedMesh>
    </>
  );
}

type Counts = { trees: number; bushes: number; rocks: number };

function ForestTile({
  geometries,
  density,
  spread,
  clearing,
  cull,
}: {
  geometries: TreeGeometries;
  density: Counts;
  spread: Counts;
  clearing: number;
  cull: CullRefs;
}) {
  const trees = useMemo(
    () =>
      randomTransforms(density.trees, [MIN_X.trees, spread.trees], clearing),
    [density.trees, spread.trees, clearing],
  );
  const bushes = useMemo(
    () =>
      randomTransforms(density.bushes, [MIN_X.bushes, spread.bushes], clearing),
    [density.bushes, spread.bushes, clearing],
  );
  const rocks = useMemo(
    () =>
      randomTransforms(density.rocks, [MIN_X.rocks, spread.rocks], clearing),
    [density.rocks, spread.rocks, clearing],
  );

  return (
    <>
      <InstancedTrees geometries={geometries} transforms={trees} cull={cull} />
      <InstancedClutter
        geometry={geometries.bush}
        transforms={bushes}
        color="#2e4a26"
        cull={cull}
      />
      <InstancedClutter
        geometry={geometries.rock}
        transforms={rocks}
        color="#5c5850"
        roughness={1}
        cull={cull}
      />
    </>
  );
}

// Tiles of procedural pines scroll along z, looping like the rails.
export default function Forest(props: ThreeElements["group"]) {
  const geometries = useTreeGeometries();

  const {
    tileCount,
    treesPerTile,
    treeSpread,
    bushesPerTile,
    bushSpread,
    rocksPerTile,
    rockSpread,
    clearing,
  } = useControls("Forest", {
    tileCount: { value: 6, min: 2, max: 14, step: 1 },
    treesPerTile: { value: 32, min: 0, max: 60, step: 1 },
    treeSpread: { value: 40, min: 5, max: 80, step: 1 },
    bushesPerTile: { value: 24, min: 0, max: 60, step: 1 },
    bushSpread: { value: 32, min: 5, max: 80, step: 1 },
    rocksPerTile: { value: 18, min: 0, max: 60, step: 1 },
    rockSpread: { value: 36, min: 5, max: 80, step: 1 },
    clearing: { value: 2, min: 0, max: 10, step: 0.5 },
  });

  const density = {
    trees: treesPerTile,
    bushes: bushesPerTile,
    rocks: rocksPerTile,
  };
  const spread = { trees: treeSpread, bushes: bushSpread, rocks: rockSpread };

  const tiles = useScrollingLoop(tileCount, TILE_SPACING);

  // Eased 0 → 1 while arriving at / waiting in the station.
  const { mode } = useTrainContext();
  const cullFactorRef = useRef(0);
  useFrame((_, delta) => {
    const target = mode === "arriving" || mode === "station" ? 1 : 0;
    const next = THREE.MathUtils.damp(
      cullFactorRef.current,
      target,
      CULL_RATE,
      delta,
    );
    cullFactorRef.current = Math.abs(next - target) < 0.005 ? target : next;
  });

  return (
    <group {...props}>
      {tiles.map(({ ref, position }, index) => (
        <group key={index} ref={ref} position={position}>
          <ForestTile
            geometries={geometries}
            density={density}
            spread={spread}
            clearing={clearing}
            cull={{ tileRef: ref, factorRef: cullFactorRef }}
          />
        </group>
      ))}
    </group>
  );
}
