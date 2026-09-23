import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { useControls } from "leva";
import { RAIL_TILE_LENGTH } from "../config/worldScale";
import useScrollingLoop from "../hooks/useScrollingLoop";

// Matches the rails' rendered tile length so the forest scrolls in the same
// world-space units as the track, and tree distances stay relative to the
// train's actual size.
const TILE_SPACING = RAIL_TILE_LENGTH;
const MIN_X = { trees: 1.5, bushes: 1, rocks: 1.2 };

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

function randomTransforms(
  count: number,
  [minX, maxX]: [number, number],
): Transform[] {
  const items: Transform[] = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < count; i++) {
      items.push({
        x: side * (minX + Math.random() * (maxX - minX)),
        z: (Math.random() - 0.5) * TILE_SPACING,
        scale: 0.6 + Math.random() * 0.9,
        rotationY: Math.random() * Math.PI * 2,
      });
    }
  }
  return items;
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
}: {
  geometry: THREE.BufferGeometry;
  transforms: Transform[];
  color: string;
  roughness?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => setInstanceTransforms(ref.current, transforms), [transforms]);

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
}: {
  geometries: TreeGeometries;
  transforms: Transform[];
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const lowRef = useRef<THREE.InstancedMesh>(null);
  const highRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    setInstanceTransforms(trunkRef.current, transforms);
    setInstanceTransforms(lowRef.current, transforms);
    setInstanceTransforms(highRef.current, transforms);
  }, [transforms]);

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
}: {
  geometries: TreeGeometries;
  density: Counts;
  spread: Counts;
}) {
  const trees = useMemo(
    () => randomTransforms(density.trees, [MIN_X.trees, spread.trees]),
    [density.trees, spread.trees],
  );
  const bushes = useMemo(
    () => randomTransforms(density.bushes, [MIN_X.bushes, spread.bushes]),
    [density.bushes, spread.bushes],
  );
  const rocks = useMemo(
    () => randomTransforms(density.rocks, [MIN_X.rocks, spread.rocks]),
    [density.rocks, spread.rocks],
  );

  return (
    <>
      <InstancedTrees geometries={geometries} transforms={trees} />
      <InstancedClutter
        geometry={geometries.bush}
        transforms={bushes}
        color="#2e4a26"
      />
      <InstancedClutter
        geometry={geometries.rock}
        transforms={rocks}
        color="#5c5850"
        roughness={1}
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
  } = useControls("Forest", {
    tileCount: { value: 6, min: 2, max: 14, step: 1 },
    treesPerTile: { value: 32, min: 0, max: 60, step: 1 },
    treeSpread: { value: 40, min: 5, max: 80, step: 1 },
    bushesPerTile: { value: 24, min: 0, max: 60, step: 1 },
    bushSpread: { value: 32, min: 5, max: 80, step: 1 },
    rocksPerTile: { value: 18, min: 0, max: 60, step: 1 },
    rockSpread: { value: 36, min: 5, max: 80, step: 1 },
  });

  const density = {
    trees: treesPerTile,
    bushes: bushesPerTile,
    rocks: rocksPerTile,
  };
  const spread = { trees: treeSpread, bushes: bushSpread, rocks: rockSpread };

  const tiles = useScrollingLoop(tileCount, TILE_SPACING);

  return (
    <group {...props}>
      {tiles.map(({ ref, position }, index) => (
        <group key={index} ref={ref} position={position}>
          <ForestTile
            geometries={geometries}
            density={density}
            spread={spread}
          />
        </group>
      ))}
    </group>
  );
}
