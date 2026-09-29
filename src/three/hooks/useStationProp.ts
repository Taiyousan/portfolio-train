import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import { useStationHints, type HintedProp } from "../state/StationHints";

// A clickable prop's wiggle: a quick stretch up, then a rocking that dies
// out, seen sideways from the track (about x). Played in full now and then
// to hint at the click (see StationHints), and `hover` as strong as the
// pointer comes onto the prop. None with reduced motion. Seconds and
// radians.
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
  // Whether it wiggles at all (not the building: it looks wrong).
  wiggle?: boolean;
  // Whether it's playing its click animation: no wiggle on hover then.
  isAnimating?: () => boolean;
};

// Pointer handlers making a station prop clickable while the train waits
// at the station and the departures board isn't open: a pointer cursor on
// hover, and `onClick` on click. Both stop propagating, so a prop in front
// of another (the clock on the building) takes the click alone. `bind`
// goes on the prop's outer group and `pose` on a group just inside it,
// which wiggles to hint at the click, and a little on hover. `hint`
// (hovered, discovered yet) is for its HintOrb.
export function useStationClick(
  onClick: () => void,
  { pivot = [0, 0, 0], wiggle = true, isAnimating }: ClickOptions = {},
) {
  const { mode, stop, boardFocused } = useTrainContext();
  const atStation = mode === "stopped" && stop === "station";
  const clickable = atStation && !boardFocused;
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const hints = useStationHints();
  const poseRef = useRef<THREE.Group>(null);
  // The wiggle playing: when it started on the frame clock, and how strong
  // (1 in full); null at rest. On hover it's asked for with its strength,
  // and starts on the next frame.
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
  useEffect(() => {
    if (wiggle) return hints.register(hintedRef.current);
  }, [hints, wiggle]);

  // Whether this prop set the pointer cursor, so it's put back if the prop
  // stops being clickable while hovered (departure, board opened).
  const pointingRef = useRef(false);
  useEffect(() => {
    if (!clickable && pointingRef.current) {
      pointingRef.current = false;
      hintedRef.current.hovered = false;
      document.body.style.cursor = "";
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

  const bind = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (!clickable) return;
      e.stopPropagation();
      hints.discover(hintedRef.current);
      onClick();
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      if (!clickable) return;
      e.stopPropagation();
      pointingRef.current = true;
      hintedRef.current.hovered = true;
      document.body.style.cursor = "pointer";
      // Not while it's already wiggling or playing its click animation.
      if (
        wiggle &&
        !reducedMotion &&
        nudgeRef.current === null &&
        !isAnimating?.()
      ) {
        hoverNudgeRef.current = true;
      }
    },
    onPointerOut: () => {
      if (!pointingRef.current) return;
      pointingRef.current = false;
      hintedRef.current.hovered = false;
      document.body.style.cursor = "";
    },
  };
  return { bind, pose: poseRef, hint: hintedRef, atStation };
}

// A prop playing a `duration`-second animation when clicked, one at a
// time. `animate` runs every frame with the seconds since the click, or
// null at rest, and whether the visitor prefers reduced motion. Cut short
// (back to rest) as soon as the train leaves.
export default function useStationProp(
  duration: number,
  animate: (t: number | null, reducedMotion: boolean) => void,
  options?: ClickOptions,
) {
  const startRef = useRef<number | null>(null);
  const clickedRef = useRef(false);
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const { bind, pose, hint, atStation } = useStationClick(
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
    if (t !== null && (t >= duration || !atStation)) {
      startRef.current = null;
      t = null;
    }
    animate(t, reducedMotion);
  });

  return { bind, pose, hint };
}
