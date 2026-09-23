import { createRef, useMemo, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";

export type ScrollingTile = {
  ref: RefObject<THREE.Group | null>;
  position: [number, number, number];
};

// Returns `tileCount` group refs spaced `tileSpacing` apart along z. Each
// frame they scroll backward at the train's speed, and whichever tile falls
// behind the loop point jumps back around to the front — tileCount controls
// how far away that jump sits, so it can be pushed past the fog's visible
// range to hide it.
export default function useScrollingLoop(
  tileCount: number,
  tileSpacing: number,
): ScrollingTile[] {
  const { trainSpeedRef } = useTrainContext();
  const totalLength = tileCount * tileSpacing;
  const halfLength = totalLength / 2;

  const tileRefs = useMemo(
    () => Array.from({ length: tileCount }, () => createRef<THREE.Group>()),
    [tileCount],
  );

  useFrame((_, delta) => {
    tileRefs.forEach((tile) => {
      if (!tile.current) return;
      tile.current.position.z -= delta * trainSpeedRef.current;
      if (tile.current.position.z <= -halfLength) {
        tile.current.position.z += totalLength;
      }
    });
  });

  return tileRefs.map((ref, index) => ({
    ref,
    position: [0, 0, (index - (tileCount - 1) / 2) * tileSpacing],
  }));
}
