"use client";

import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { TrainProvider, useTrainContext } from "./state/TrainContext";
import useDebugMode from "./hooks/useDebugMode";
import TrainScene from "./scenes/TrainScene";
import { CAMERA_POSITION } from "./config/scene";

function Overlay() {
  const { cameraControlsRef, mode, setMode } = useTrainContext();

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-5 text-sm text-white">
      <Link href="/" className="pointer-events-auto underline">
        ← Accueil
      </Link>
      <div className="flex gap-2">
        {/* Temporary trigger to reach the "about" camera shot for tuning —
            step 5 (docs/proto-train.md) replaces this with a real cab-click
            interaction and HTML panel. */}
        <button
          type="button"
          onClick={() => setMode(mode === "about" ? "ride" : "about")}
          className="pointer-events-auto rounded-full border border-white/40 px-3 py-1 hover:bg-white/10"
        >
          {mode === "about" ? "Retour au voyage" : "À propos du conducteur"}
        </button>
        <button
          type="button"
          disabled={mode === "arriving" || mode === "departing"}
          onClick={() =>
            setMode(mode === "station" ? "departing" : "arriving")
          }
          className="pointer-events-auto rounded-full border border-white/40 px-3 py-1 hover:bg-white/10 disabled:opacity-50"
        >
          {mode === "station" ? "Repartir" : "Arriver en gare"}
        </button>
        <button
          type="button"
          onClick={() => cameraControlsRef.current?.reset(true)}
          className="pointer-events-auto rounded-full border border-white/40 px-3 py-1 hover:bg-white/10"
        >
          Recentrer la vue
        </button>
      </div>
    </div>
  );
}

// Full-screen train scene. Append #debug to the URL to show the Leva panel.
export default function Experience() {
  const debug = useDebugMode();

  return (
    <TrainProvider>
      {debug && <Leva collapsed />}
      <Canvas
        shadows="percentage"
        camera={{
          fov: 45,
          near: 0.3,
          far: 150,
          position: CAMERA_POSITION,
        }}
      >
        <color args={["#3a2a1f"]} attach="background" />
        <TrainScene />
      </Canvas>
      <Overlay />
    </TrainProvider>
  );
}
