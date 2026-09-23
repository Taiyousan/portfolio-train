import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";

// Eases trainSpeedRef toward targetTrainSpeed once per frame, framerate-
// independent (THREE.MathUtils.damp). Mount once inside the Canvas — call
// from TrainScene, not from every speed consumer.
export default function useTrainSpeedEasing(smoothTime = 0.6) {
  const { trainSpeedRef, targetTrainSpeed, mode } = useTrainContext();

  useFrame((_, delta) => {
    // Braking and the stop are driven by useStationApproach.
    if (mode === "arriving" || mode === "station") return;
    trainSpeedRef.current = THREE.MathUtils.damp(
      trainSpeedRef.current,
      targetTrainSpeed,
      1 / smoothTime,
      delta,
    );
  });
}
