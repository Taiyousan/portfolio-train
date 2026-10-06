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
import { SEASONS, type Season } from "../config/seasons";

// See docs/proto-train.md — one mode drives target speed, camera position
// and HTML overlay together. arriving / stopped / departing apply to the
// current stop. "custom" is the workshop, where the locomotive is
// repainted and the driver dressed (see ui/Workshop).
export type TrainMode =
  "ride" | "arriving" | "stopped" | "departing" | "custom";

// Where the train stops: the station (projects, departures board) or home
// (about: the driver, cap off, working at a desk on the terrace).
export type Stop = "station" | "home";

// What the workshop is showing (its tab), and the camera closing in on.
export type WorkshopView = "train" | "driver";

// How far the scene has blended into each season, summing to 1.
export type SeasonWeights = Record<Season, number>;

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
  // The stop the train is heading to, waiting at or leaving. Set before
  // switching to "arriving".
  stop: Stop;
  setStop: (stop: Stop) => void;
  // Project opened from the departures board (3D rows or their HTML twin),
  // by slug. Only shown while at the station.
  selectedSlug: string | null;
  setSelectedSlug: (slug: string | null) => void;
  // At the station, the camera has zoomed onto the departures board (a
  // click on it) and its rows can be picked.
  boardFocused: boolean;
  setBoardFocused: (focused: boolean) => void;
  workshopView: WorkshopView;
  setWorkshopView: (view: WorkshopView) => void;
  // Season picked with the switch (see config/seasons). The scene blends
  // into it gradually: seasonWeightsRef, eased once per frame by
  // useSeasonEasing and read from useFrame, like trainSpeedRef.
  season: Season;
  setSeason: (season: Season) => void;
  seasonWeightsRef: RefObject<SeasonWeights>;
  // The scene has loaded and drawn its first frames (see SceneReady in
  // scenes/TrainScene): the loading screen can go.
  ready: boolean;
  setReady: (ready: boolean) => void;
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
  const [stop, setStop] = useState<Stop>("station");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [boardFocused, setBoardFocused] = useState(false);
  const [workshopView, setWorkshopView] = useState<WorkshopView>("train");
  const [season, setSeason] = useState<Season>("summer");
  const [ready, setReady] = useState(false);
  const seasonWeightsRef = useRef(
    Object.fromEntries(
      SEASONS.map((other) => [other, other === "summer" ? 1 : 0]),
    ) as SeasonWeights,
  );

  return (
    <TrainContext.Provider
      value={{
        cameraControlsRef,
        trainSpeedRef,
        targetTrainSpeed,
        setTargetTrainSpeed,
        mode,
        setMode,
        stop,
        setStop,
        selectedSlug,
        setSelectedSlug,
        boardFocused,
        setBoardFocused,
        workshopView,
        setWorkshopView,
        season,
        setSeason,
        seasonWeightsRef,
        ready,
        setReady,
      }}
    >
      {children}
    </TrainContext.Provider>
  );
}
