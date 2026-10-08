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

// One mode drives the train's speed, the camera and the HTML overlay
// together. arriving / stopped / departing apply to the current stop.
// "custom" is the workshop (see ui/Workshop).
export type TrainMode =
  "ride" | "arriving" | "stopped" | "departing" | "custom";

// Where the train stops: the station (the projects) or home (about).
export type Stop = "station" | "home";

// The workshop's tab, which the camera closes in on.
export type WorkshopView = "train" | "driver";

// The locomotive's hop when clicked (see Train): lifted off the rails by
// `lift` (world units), stretched up by `stretch` and bulging out by
// `bulge`; 0, 1 and 1 at rest.
export type TrainHop = { lift: number; stretch: number; bulge: number };

// How far the scene has blended into each season, summing to 1.
export type SeasonWeights = Record<Season, number>;

type TrainContextValue = {
  cameraControlsRef: RefObject<CameraControls | null>;
  // Current speed, eased toward targetTrainSpeed (see useTrainSpeedEasing).
  // A ref, not state: it changes every frame and is read in useFrame.
  trainSpeedRef: RefObject<number>;
  targetTrainSpeed: number;
  setTargetTrainSpeed: (speed: number) => void;
  // Set every frame by Train, for the smoke to leave the chimney where it
  // is.
  trainHopRef: RefObject<TrainHop>;
  mode: TrainMode;
  setMode: (mode: TrainMode) => void;
  // The stop the train is heading to, waiting at or leaving. Set before
  // switching to "arriving".
  stop: Stop;
  setStop: (stop: Stop) => void;
  // Project opened from the departures board, by slug.
  selectedSlug: string | null;
  setSelectedSlug: (slug: string | null) => void;
  // At the station, the camera has zoomed onto the departures board and its
  // rows can be picked.
  boardFocused: boolean;
  setBoardFocused: (focused: boolean) => void;
  workshopView: WorkshopView;
  setWorkshopView: (view: WorkshopView) => void;
  // Season picked with the switch. The scene blends into it gradually:
  // seasonWeightsRef, eased every frame by useSeasonEasing.
  season: Season;
  setSeason: (season: Season) => void;
  seasonWeightsRef: RefObject<SeasonWeights>;
  // The scene has loaded and drawn its first frames: the loading screen can
  // go.
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
  const trainHopRef = useRef<TrainHop>({ lift: 0, stretch: 1, bulge: 1 });
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
        trainHopRef,
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
