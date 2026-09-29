import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFrame } from "@react-three/fiber";
import { useTrainContext } from "./TrainContext";

// Hints that the station's props can be clicked: while the train waits at
// the station, every few seconds one prop not clicked yet gives a little
// wiggle (see useStationClick, which draws it), one at a time. None with
// reduced motion. Timings in seconds: the first wiggle once the train has
// stopped, then a random gap between two, also held off after a click.
const HINTS = { first: 1.5, gapMin: 2, gapMax: 3.5 };

// A clickable prop, as registered by useStationClick. `nudge` starts its
// wiggle at a time on the frame clock.
export type HintedProp = {
  discovered: boolean;
  hovered: boolean;
  nudge: (at: number) => void;
};

type StationHintsValue = {
  register: (prop: HintedProp) => () => void;
  // A prop was clicked: it's discovered, and the next wiggle waits.
  discover: (prop: HintedProp) => void;
};

const StationHintsContext = createContext<StationHintsValue | null>(null);

export function useStationHints() {
  const context = useContext(StationHintsContext);
  if (!context) {
    throw new Error("useStationHints must be used within StationHints");
  }
  return context;
}

export function StationHints({ children }: { children: ReactNode }) {
  const { mode, stop, boardFocused } = useTrainContext();
  const clickable = mode === "stopped" && stop === "station" && !boardFocused;
  const propsRef = useRef(new Set<HintedProp>());
  const lastRef = useRef<HintedProp | null>(null);
  // Frame-clock time of the next wiggle; null until the props are
  // clickable, and again once they aren't.
  const nextRef = useRef<number | null>(null);
  const nowRef = useRef(0);
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const gap = () =>
    HINTS.gapMin + Math.random() * (HINTS.gapMax - HINTS.gapMin);

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    nowRef.current = now;
    if (!clickable || reducedMotion) {
      nextRef.current = null;
      return;
    }
    if (nextRef.current === null) nextRef.current = now + HINTS.first;
    if (now < nextRef.current) return;
    nextRef.current = now + gap();
    const waiting = [...propsRef.current].filter(
      (prop) => !prop.discovered && !prop.hovered,
    );
    // Not the same prop twice in a row, unless it's the last one left.
    const pool =
      waiting.length > 1
        ? waiting.filter((prop) => prop !== lastRef.current)
        : waiting;
    const prop = pool[Math.floor(Math.random() * pool.length)];
    if (!prop) return;
    lastRef.current = prop;
    prop.nudge(now);
  });

  const [value] = useState<StationHintsValue>(() => ({
    register: (prop) => {
      propsRef.current.add(prop);
      return () => {
        propsRef.current.delete(prop);
      };
    },
    discover: (prop) => {
      prop.discovered = true;
      if (nextRef.current !== null) {
        nextRef.current = Math.max(nextRef.current, nowRef.current + gap());
      }
    },
  }));

  return (
    <StationHintsContext.Provider value={value}>
      {children}
    </StationHintsContext.Provider>
  );
}
