import { useEffect, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useSpring } from "@react-spring/three";
import type * as THREE from "three";
import { POP_SPRING } from "../config/scene";
import { useStationHints, type HintedOrb } from "../state/StationHints";

// A hint at the click (`mesh`: a HintOrb's ball, the departures board's
// arrow), coming on in turn with the others once the camera has settled
// (see StationHints), unless its prop has been `discovered` (clicked).
// Returns its size, 0 to 1 (past it as it overshoots), popping in and out
// like the stop's fittings, with their spring; at once with reduced
// motion.
export default function useHintReveal(
  mesh: RefObject<THREE.Object3D | null>,
  discovered: () => boolean = () => false,
) {
  const hints = useStationHints();
  const [orb] = useState<HintedOrb>(() => ({
    mesh,
    discovered,
    showAt: null,
  }));
  useEffect(() => hints.registerOrb(orb), [hints, orb]);
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [{ size }, api] = useSpring(() => ({ size: 0 }));

  const onRef = useRef(false);
  useFrame(({ clock }) => {
    const on =
      orb.showAt !== null &&
      clock.elapsedTime >= orb.showAt &&
      !orb.discovered();
    if (on === onRef.current) return;
    onRef.current = on;
    api.start({
      size: on ? 1 : 0,
      immediate: reducedMotion,
      // Overshoots on the way in only (see Station).
      config: { ...POP_SPRING, clamp: !on },
    });
  });

  return size;
}
