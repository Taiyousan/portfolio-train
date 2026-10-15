import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { POP_STAGGER_MS, STOP_SETTLE_MS } from "../config/scene";
import { useTrainContext, type Stop } from "./TrainContext";
import useReducedMotion from "../hooks/useReducedMotion";

// Hints that a stop's props can be clicked: while the train waits there,
// every few seconds one prop not clicked yet gives a little wiggle (drawn
// by useStationClick). None with reduced motion. In seconds: the first
// wiggle after the stop, then a random gap between two, also held off
// after a click.
const HINTS = { first: 1.5, gapMin: 2, gapMax: 3.5 };
// The glowing hints (the balls over the props, the arrow over the board)
// come on once the camera has settled on the stop, popping in left to right
// on screen (see useHintReveal). No sooner than SETTLE seconds after the
// stop: the camera may still rest on its arrival shot.
const SETTLE = STOP_SETTLE_MS / 1000 + 0.2;
// Scratch vector for the hints' places on screen.
const onScreen = new THREE.Vector3();

// A clickable prop, as registered by useStationClick. `nudge` starts its
// wiggle at a time on the frame clock.
export type HintedProp = {
  discovered: boolean;
  hovered: boolean;
  nudge: (at: number) => void;
};

// A glowing hint, as registered by useHintReveal: its mesh, whether its
// prop has been clicked already, and when it comes on (on the frame clock;
// null while the hints are off).
export type HintedOrb = {
  mesh: RefObject<THREE.Object3D | null>;
  discovered: () => boolean;
  showAt: number | null;
};

type StationHintsValue = {
  // The stop these props stand at: they're clickable only there.
  stop: Stop;
  // Whether they hint at the click at all: not at home, where they're left
  // to be found.
  hinted: boolean;
  register: (prop: HintedProp) => () => void;
  registerOrb: (orb: HintedOrb) => () => void;
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

export function StationHints({
  stop: here,
  hinted = true,
  children,
}: {
  stop: Stop;
  hinted?: boolean;
  children: ReactNode;
}) {
  const { mode, stop, boardFocused, cameraControlsRef } = useTrainContext();
  // Wiggling while the props are clickable, if they're hinted at all.
  const hinting =
    hinted && mode === "stopped" && stop === here && !boardFocused;
  const propsRef = useRef(new Set<HintedProp>());
  const lastRef = useRef<HintedProp | null>(null);
  // Frame-clock time of the next wiggle; null until the props are
  // clickable, and again once they aren't.
  const nextRef = useRef<number | null>(null);
  const nowRef = useRef(0);
  const orbsRef = useRef(new Set<HintedOrb>());
  // Frame-clock time the props became clickable, and whether their hints
  // have been lined up to come on since.
  const sinceRef = useRef<number | null>(null);
  const shownRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const gap = () =>
    HINTS.gapMin + Math.random() * (HINTS.gapMax - HINTS.gapMin);

  useFrame(({ clock, camera }) => {
    const now = clock.elapsedTime;
    nowRef.current = now;

    // The glowing hints: off with the props unclickable, lined up to come on
    // once the camera has settled.
    if (!hinting) {
      sinceRef.current = null;
      shownRef.current = false;
      for (const orb of orbsRef.current) orb.showAt = null;
    } else {
      sinceRef.current ??= now;
      if (
        !shownRef.current &&
        now - sinceRef.current >= SETTLE &&
        !cameraControlsRef.current?.active
      ) {
        shownRef.current = true;
        [...orbsRef.current]
          .filter((orb) => orb.mesh.current && !orb.discovered())
          .map((orb) => ({
            orb,
            x: orb.mesh.current!.getWorldPosition(onScreen).project(camera).x,
          }))
          .sort((a, b) => a.x - b.x)
          .forEach(({ orb }, i) => {
            orb.showAt = now + (i * POP_STAGGER_MS) / 1000;
          });
      }
    }

    if (!hinting || reducedMotion) {
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
    stop: here,
    hinted,
    register: (prop) => {
      propsRef.current.add(prop);
      return () => {
        propsRef.current.delete(prop);
      };
    },
    registerOrb: (orb) => {
      orbsRef.current.add(orb);
      return () => {
        orbsRef.current.delete(orb);
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
