"use client";

import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { TrainProvider, useTrainContext } from "./state/TrainContext";
import useDebugMode from "./hooks/useDebugMode";
import TrainScene from "./scenes/TrainScene";

function Overlay() {
  const { cameraControlsRef } = useTrainContext();

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-5 text-sm text-white">
      <Link href="/" className="pointer-events-auto underline">
        ← Accueil
      </Link>
      <button
        type="button"
        onClick={() => cameraControlsRef.current?.reset(true)}
        className="pointer-events-auto rounded-full border border-white/40 px-3 py-1 hover:bg-white/10"
      >
        Recentrer la vue
      </button>
    </div>
  );
}

// Full-screen train scene. Append #debug to the URL to show the Leva panel.
export default function Experience() {
  const debug = useDebugMode();

  return (
    <TrainProvider>
      <Leva hidden={!debug} />
      <Canvas
        shadows="percentage"
        camera={{
          fov: 45,
          near: 0.3,
          far: 150,
          position: [-5.552903814384558, 1.0595020092319951, -0.09906038769694253],
        }}
      >
        <color args={["#3a2a1f"]} attach="background" />
        <TrainScene />
      </Canvas>
      <Overlay />
    </TrainProvider>
  );
}
