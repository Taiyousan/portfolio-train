import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useSpring, useSprings, type SpringValue } from "@react-spring/three";
import type * as THREE from "three";
import { useTrainContext, type Stop } from "../state/TrainContext";
import { POP_SPRING, POP_STAGGER_MS } from "../config/scene";

// The fittings start popping once the stop is this close to its place, so
// the overshoot lands as the train comes to rest.
const POP_DISTANCE = 2;
// On departure, the stop itself sinks this long after its last fitting
// starts shrinking.
const SINK_DELAY_MS = 250;

// A stop's fittings popping in one after the other in `order`, scaled by
// `pops`, and shrinking away in reverse as soon as the train departs; then
// the rest of the stop (`base`) sinks into the ground. `groupRef` is the
// stop's group, moved by useStopApproach.
export default function useStopPop<Name extends string>(
  stop: Stop,
  order: readonly Name[],
  groupRef: RefObject<THREE.Group | null>,
) {
  const { mode, stop: current } = useTrainContext();
  const here = current === stop;
  const [springs, popApi] = useSprings(order.length, () => ({
    scale: 0,
    config: POP_SPRING,
  }));
  const pops = Object.fromEntries(
    order.map((name, i) => [name, springs[i].scale]),
  ) as Record<Name, SpringValue<number>>;
  // Clamped, so it doesn't overshoot into a negative (mirrored) scale.
  const [{ base }, baseApi] = useSpring(() => ({
    base: 1,
    config: { ...POP_SPRING, clamp: true },
  }));
  const shownRef = useRef(false);
  const sunkRef = useRef(false);

  useFrame(() => {
    const z = groupRef.current?.position.z ?? Infinity;
    // z > 0: on the first "arriving" frame, the stop may still be where it
    // was left, not yet moved out to STOP_DISTANCE. Once shown, it stays
    // shown for the rest of the approach: the frame it reaches z = 0 is
    // still an "arriving" one.
    const approaching = shownRef.current || (z > 0 && z < POP_DISTANCE);
    const show =
      here && (mode === "stopped" || (mode === "arriving" && approaching));
    if (show !== shownRef.current) {
      shownRef.current = show;
      const last = order.length - 1;
      popApi.start((i) => ({
        scale: show ? 1 : 0,
        delay: (show ? i : last - i) * POP_STAGGER_MS,
        // Overshoots on the way in only: on the way out it would dip below
        // 0 and bounce back, flashing the fittings on again. Set either
        // way, as react-spring merges config into the last one.
        config: { ...POP_SPRING, clamp: !show },
      }));
      if (!show) {
        sunkRef.current = true;
        baseApi.start({
          base: 0,
          delay: SINK_DELAY_MS + last * POP_STAGGER_MS,
        });
      }
    }
    // Back to full size, out of sight, before sliding in again.
    if (sunkRef.current && here && mode === "arriving") {
      sunkRef.current = false;
      baseApi.stop();
      baseApi.set({ base: 1 });
    }
  });

  return { pops, base };
}
