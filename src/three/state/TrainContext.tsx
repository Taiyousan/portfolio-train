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

type TrainContextValue = {
  cameraControlsRef: RefObject<CameraControls | null>;
  trainSpeed: number;
  setTrainSpeed: (speed: number) => void;
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
  const [trainSpeed, setTrainSpeed] = useState(3);

  return (
    <TrainContext.Provider
      value={{ cameraControlsRef, trainSpeed, setTrainSpeed }}
    >
      {children}
    </TrainContext.Provider>
  );
}
