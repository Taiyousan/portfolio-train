import { useEffect, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useTrainContext } from "../state/TrainContext";

// Pointer handlers making a station prop clickable while the train waits
// at the station and the departures board isn't open: a pointer cursor on
// hover, and `onClick` on click. Both stop propagating, so a prop in front
// of another (the clock on the building) takes the click alone.
export function useStationClick(onClick: () => void) {
  const { mode, stop, boardFocused } = useTrainContext();
  const atStation = mode === "stopped" && stop === "station";
  const clickable = atStation && !boardFocused;
  // Whether this prop set the pointer cursor, so it's put back if the prop
  // stops being clickable while hovered (departure, board opened).
  const pointingRef = useRef(false);
  useEffect(() => {
    if (!clickable && pointingRef.current) {
      pointingRef.current = false;
      document.body.style.cursor = "";
    }
  }, [clickable]);
  const bind = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (!clickable) return;
      e.stopPropagation();
      onClick();
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      if (!clickable) return;
      e.stopPropagation();
      pointingRef.current = true;
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      if (!pointingRef.current) return;
      pointingRef.current = false;
      document.body.style.cursor = "";
    },
  };
  return { bind, atStation };
}

// A prop playing a `duration`-second animation when clicked, one at a
// time. `animate` runs every frame with the seconds since the click, or
// null at rest, and whether the visitor prefers reduced motion. Cut short
// (back to rest) as soon as the train leaves.
export default function useStationProp(
  duration: number,
  animate: (t: number | null, reducedMotion: boolean) => void,
) {
  const startRef = useRef<number | null>(null);
  const clickedRef = useRef(false);
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const { bind, atStation } = useStationClick(() => {
    if (startRef.current === null) clickedRef.current = true;
  });

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

  return bind;
}
