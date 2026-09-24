"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { CameraControls } from "@react-three/drei";

// See docs/proto-train.md — one mode drives target speed, camera position
// and HTML overlay together.
export type TrainMode = "ride" | "arriving" | "station" | "departing" | "about";

type TrainContextValue = {
  cameraControlsRef: RefObject<CameraControls | null>;
  // Current, smoothed speed — eased toward targetTrainSpeed once per frame
  // (see useTrainSpeedEasing). A ref rather than state: it changes every
  // frame, and useFrame consumers (Train, Smoke, useScrollingLoop) read it
  // directly without needing a re-render.
  trainSpeedRef: RefObject<number>;
  targetTrainSpeed: number;
  setTargetTrainSpeed: (speed: number) => void;
  mode: TrainMode;
  setMode: (mode: TrainMode) => void;
  // Project opened from the departures board (3D rows or their HTML twin),
  // by slug. Only shown while at the station.
  selectedSlug: string | null;
  setSelectedSlug: (slug: string | null) => void;
  // At the station, the camera has zoomed onto the departures board (a
  // click on it) and its rows can be picked.
  boardFocused: boolean;
  setBoardFocused: (focused: boolean) => void;
};

const TrainContext = createContext<TrainContextValue | null>(null);

export function useTrainContext() {
  const context = useContext(TrainContext);
  if (!context) {
    throw new Error("useTrainContext must be used within a TrainProvider");
  }
  return context;
}

export function TrainProvider({ children }: { children: ReactNode }) {
  const cameraControlsRef = useRef<CameraControls | null>(null);
  const trainSpeedRef = useRef(3);
  const [targetTrainSpeed, setTargetTrainSpeed] = useState(3);
  const [mode, setMode] = useState<TrainMode>("ride");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [boardFocused, setBoardFocused] = useState(false);

  return (
    <TrainContext.Provider
      value={{
        cameraControlsRef,
        trainSpeedRef,
        targetTrainSpeed,
        setTargetTrainSpeed,
        mode,
        setMode,
        selectedSlug,
        setSelectedSlug,
        boardFocused,
        setBoardFocused,
      }}
    >
      {children}
    </TrainContext.Provider>
  );
}
