import { useRef } from "react";
import type * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { useSeasonColor } from "../hooks/useSeason";

// Static placeholder ground under the forest so the trees don't float.
// Large enough to stay under the tree tiles at all times; doesn't need to
// scroll since it's a uniform color with no visible seams. Coloured by the
// season (snow in winter).
export default function ForestFloor(props: ThreeElements["mesh"]) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  useSeasonColor(materialRef, "ground");

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow {...props}>
      <planeGeometry args={[90, 320]} />
      <meshStandardMaterial ref={materialRef} roughness={1} />
    </mesh>
  );
}
