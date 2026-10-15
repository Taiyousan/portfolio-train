import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { useTrainContext, type Stop } from "../state/TrainContext";
import { ARRIVE_DURATION, STOP_EXIT_Z, STOP_DISTANCE } from "../config/scene";

// Fraction of the cruise speed at which departure counts as finished.
const DEPARTED_SPEED_RATIO = 0.95;

// Drives the arriving / stopped / departing modes for the train's stop.
//   arriving:  the stop's z = D·(1 − t/T)², a constant deceleration to
//              z = 0, the train's speed set to its derivative so the world
//              scrolls in step.
//   departing: useTrainSpeedEasing speeds the train back up, and the stop
//              scrolls away.
export default function useStopApproach(
  stationRef: RefObject<THREE.Group | null>,
  homeRef: RefObject<THREE.Group | null>,
) {
  const { trainSpeedRef, targetTrainSpeed, mode, setMode, stop } =
    useTrainContext();
  const elapsedRef = useRef(0);
  const previousModeRef = useRef(mode);

  useFrame((_, delta) => {
    const groups: Record<Stop, THREE.Group | null> = {
      station: stationRef.current,
      home: homeRef.current,
    };
    const target = groups[stop];
    if (!target) return;

    if (previousModeRef.current !== mode) {
      previousModeRef.current = mode;
      elapsedRef.current = 0;
      if (mode === "arriving") {
        target.position.z = STOP_DISTANCE;
        target.visible = true;
      }
    }

    if (mode === "arriving") {
      elapsedRef.current += delta;
      const progress = Math.min(elapsedRef.current / ARRIVE_DURATION, 1);
      target.position.z = STOP_DISTANCE * (1 - progress) ** 2;
      trainSpeedRef.current =
        (2 * STOP_DISTANCE * (1 - progress)) / ARRIVE_DURATION;
      if (progress >= 1) {
        trainSpeedRef.current = 0;
        setMode("stopped");
      }
    } else if (mode === "departing") {
      // Back to "ride" once (nearly) at cruising speed.
      if (trainSpeedRef.current >= targetTrainSpeed * DEPARTED_SPEED_RATIO) {
        setMode("ride");
      }
    }

    // A stop left behind scrolls away with the world, until hidden in the
    // fog.
    for (const key of Object.keys(groups) as Stop[]) {
      const group = groups[key];
      if (!group?.visible) continue;
      if (key === stop && mode === "arriving") continue;
      group.position.z -= trainSpeedRef.current * delta;
      if (group.position.z <= STOP_EXIT_Z) group.visible = false;
    }
  });
}
