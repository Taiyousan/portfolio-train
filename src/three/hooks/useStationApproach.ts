import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import {
  ARRIVE_DURATION,
  STATION_EXIT_Z,
  STATION_DISTANCE,
} from "../config/scene";

// Fraction of the cruise speed at which departure counts as finished.
const DEPARTED_SPEED_RATIO = 0.95;

// Drives the arriving / station / departing modes. The station group is
// moved along z by a quadratic ease over a fixed duration, and the train's
// speed is set to that motion's derivative so the forest and rails scroll
// in lockstep with it.
//   arriving:  z = D·(1 − t/T)²   (constant deceleration, stops at z = 0)
//   departing: useTrainSpeedEasing accelerates back to the cruise speed
//              and the station scrolls away at that speed.
export default function useStationApproach(
  stationRef: RefObject<THREE.Group | null>,
) {
  const { trainSpeedRef, targetTrainSpeed, mode, setMode } = useTrainContext();
  const elapsedRef = useRef(0);
  const previousModeRef = useRef(mode);

  useFrame((_, delta) => {
    const station = stationRef.current;
    if (!station) return;

    if (previousModeRef.current !== mode) {
      previousModeRef.current = mode;
      elapsedRef.current = 0;
      if (mode === "arriving") {
        station.position.z = STATION_DISTANCE;
        station.visible = true;
      }
    }

    if (mode === "arriving") {
      elapsedRef.current += delta;
      const progress = Math.min(elapsedRef.current / ARRIVE_DURATION, 1);
      station.position.z = STATION_DISTANCE * (1 - progress) ** 2;
      trainSpeedRef.current =
        (2 * STATION_DISTANCE * (1 - progress)) / ARRIVE_DURATION;
      if (progress >= 1) {
        trainSpeedRef.current = 0;
        setMode("station");
      }
    } else if (mode === "departing") {
      // Speed is eased toward cruise by useTrainSpeedEasing; hand back to
      // "ride" once it has (nearly) got there — never above it.
      if (trainSpeedRef.current >= targetTrainSpeed * DEPARTED_SPEED_RATIO) {
        setMode("ride");
      }
    }

    // The station keeps scrolling away with the world after the mode has
    // gone back to "ride", until it is far enough to be hidden by the fog.
    if (station.visible && mode !== "arriving") {
      station.position.z -= trainSpeedRef.current * delta;
      if (station.position.z <= STATION_EXIT_Z) station.visible = false;
    }
  });
}
