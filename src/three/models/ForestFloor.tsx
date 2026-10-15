import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { mixColor, mixValue, useSeasonColor } from "../hooks/useSeason";
import { useTrainContext } from "../state/TrainContext";
import { advanceTravel, groundPattern, groundSeason } from "../shaders/ground";

// The ground under the forest, large enough to stay under the scrolling
// tiles, so the mesh needn't scroll itself: its patches do, in the shader
// (see shaders/ground), which it hands the distance the world scrolls.
// Coloured by the season.
export default function ForestFloor(props: ThreeElements["mesh"]) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  useSeasonColor(materialRef, "ground");

  const { trainSpeedRef, seasonWeightsRef } = useTrainContext();
  useFrame((_, delta) => {
    advanceTravel(delta * trainSpeedRef.current);
    const weights = seasonWeightsRef.current;
    mixColor(weights, "groundPatch", groundSeason.patchColor);
    // Puddles: the season's water, dimmed by the ground around it.
    mixColor(weights, "water", groundSeason.puddleColor).multiplyScalar(0.35);
    groundSeason.setRain(mixValue(weights, "rainfall"));
  });

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow {...props}>
      <planeGeometry args={[90, 320]} />
      <meshStandardMaterial
        ref={materialRef}
        roughness={1}
        {...groundPattern}
      />
    </mesh>
  );
}
