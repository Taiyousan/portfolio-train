import { useRef } from "react";
import type * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { useSeasonColor } from "../hooks/useSeason";

// The ground under the forest, large enough to stay under the scrolling
// tiles: plain, it needn't scroll itself. Coloured by the season.
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
