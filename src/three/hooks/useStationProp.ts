import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import { useStationHints, type HintedProp } from "../state/StationHints";
import { claimPointer, releasePointer } from "../state/pointerCursor";
import useReducedMotion from "./useReducedMotion";

// A clickable prop's wiggle: a quick stretch up, then a rocking about x
// that dies out. In full now and then to hint at the click (see
// StationHints), `hover` as strong as the pointer comes onto the prop. None
// with reduced motion. Seconds and radians.
const NUDGE = {
  duration: 0.9,
  stretch: 0.08,
  pulse: 0.3,
  angle: 0.07,
  speed: 18,
  hover: 0.4,
};

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

type ClickOptions = {
  // Point the wiggle stretches and rocks about, in the prop's own frame
  // (default its origin, at its feet).
  pivot?: [number, number, number];
  // Whether it wiggles at all (not a building; nothing does where the
  // stop's props aren't hinted).
  wiggle?: boolean;
  // Whether it's playing its click animation: no wiggle on hover then.
  isAnimating?: () => boolean;
};

// Makes a prop clickable while the train waits at its stop and the board
// isn't open: a pointer cursor on hover, `onClick` on click. Only the
// nearest prop along the ray takes either (the clock, not the building
// behind it). `bind` goes on the prop's outer group and `pose` on a group
// just inside it, which wiggles. `hint` is for its HintOrb.
export function useStationClick(
  onClick: () => void,
  { pivot = [0, 0, 0], wiggle = true, isAnimating }: ClickOptions = {},
) {
  const { mode, stop, boardFocused } = useTrainContext();
  const hints = useStationHints();
  const atStop = mode === "stopped" && stop === hints.stop;
  const clickable = atStop && !boardFocused;
  const reducedMotion = useReducedMotion();
  const poseRef = useRef<THREE.Group>(null);
  // The wiggle playing: when it started on the frame clock, and how strong
  // (1 in full); null at rest. A hover asks for one on the next frame.
  const nudgeRef = useRef<{ start: number; amount: number } | null>(null);
  const hoverNudgeRef = useRef(false);
  const hintedRef = useRef<HintedProp>({
    discovered: false,
    hovered: false,
    nudge: (at) => {
      nudgeRef.current = { start: at, amount: 1 };
    },
  });
  // Only the props that wiggle get the hint wiggle.
  const wiggles = wiggle && hints.hinted;
  useEffect(() => {
    if (wiggles) return hints.register(hintedRef.current);
  }, [hints, wiggles]);

  // Whether this prop claims the pointer cursor, let go if it stops being
  // clickable while hovered.
  const pointingRef = useRef(false);
  useEffect(() => {
    if (!clickable && pointingRef.current) {
      pointingRef.current = false;
      hintedRef.current.hovered = false;
      releasePointer(hintedRef.current);
    }
  }, [clickable]);

  const [px, py, pz] = pivot;
  const pivotPoint = useMemo(() => new THREE.Vector3(px, py, pz), [px, py, pz]);
  useFrame(({ clock }) => {
    if (hoverNudgeRef.current) {
      hoverNudgeRef.current = false;
      nudgeRef.current = { start: clock.elapsedTime, amount: NUDGE.hover };
    }
    const pose = poseRef.current;
    const nudge = nudgeRef.current;
    if (!pose || nudge === null) return;
    const t = clock.elapsedTime - nudge.start;
    const amount = nudge.amount;
    let stretch = 1;
    let rock = 0;
    if (t >= NUDGE.duration || t < 0) {
      nudgeRef.current = null;
    } else {
      const fade = (1 - t / NUDGE.duration) ** 2;
      stretch =
        1 +
        NUDGE.stretch * amount * Math.sin(Math.PI * clamp01(t / NUDGE.pulse));
      rock = NUDGE.angle * amount * fade * Math.sin(t * NUDGE.speed);
    }

    // Stretched and turned about the pivot: shifted so the pivot stays put.
    const squash = 1 / Math.sqrt(stretch);
    pose.scale.set(squash, stretch, squash);
    pose.rotation.x = rock;
    pose.position
      .copy(pivotPoint)
      .multiply(pose.scale)
      .applyEuler(pose.rotation);
    pose.position.subVectors(pivotPoint, pose.position);
  });

  // The pointer comes onto the prop: a pointer cursor, and a little wiggle
  // unless it's already moving.
  const enter = () => {
    pointingRef.current = true;
    hintedRef.current.hovered = true;
    claimPointer(hintedRef.current);
    if (
      wiggles &&
      !reducedMotion &&
      nudgeRef.current === null &&
      !isAnimating?.()
    ) {
      hoverNudgeRef.current = true;
    }
  };
  // Hover follows the nearest prop along the ray, rather than stopping the
  // event: stopped, R3F drops a prop's hover between two of its parts until
  // the next move, and the cursor flickers at every seam.
  const inFront = (e: ThreeEvent<PointerEvent>) =>
    e.intersections[0]?.eventObject === e.eventObject;

  const bind = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (!clickable) return;
      e.stopPropagation();
      hints.discover(hintedRef.current);
      onClick();
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      if (clickable && !pointingRef.current && inFront(e)) enter();
    },
    // Coming out from behind a prop in front is no new hover: caught here.
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      if (clickable && !pointingRef.current && inFront(e)) enter();
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      // Still on it, only leaving one of its parts.
      if (!pointingRef.current || inFront(e)) return;
      pointingRef.current = false;
      hintedRef.current.hovered = false;
      releasePointer(hintedRef.current);
    },
  };
  return { bind, pose: poseRef, hint: hintedRef, atStop };
}

// A prop playing a `duration`-second animation when clicked, one at a
// time. `animate` runs every frame with the seconds since the click (null
// at rest) and whether to reduce motion. Cut short as soon as the train
// leaves.
export default function useStationProp(
  duration: number,
  animate: (t: number | null, reducedMotion: boolean) => void,
  options?: ClickOptions,
) {
  const startRef = useRef<number | null>(null);
  const clickedRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const { bind, pose, hint, atStop } = useStationClick(
    () => {
      if (startRef.current === null) clickedRef.current = true;
    },
    {
      ...options,
      isAnimating: () => clickedRef.current || startRef.current !== null,
    },
  );

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    if (clickedRef.current) {
      clickedRef.current = false;
      startRef.current = now;
    }
    let t = startRef.current === null ? null : now - startRef.current;
    if (t !== null && (t >= duration || !atStop)) {
      startRef.current = null;
      t = null;
    }
    animate(t, reducedMotion);
  });

  return { bind, pose, hint };
}
