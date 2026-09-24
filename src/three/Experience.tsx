"use client";

import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { TrainProvider } from "./state/TrainContext";
import useDebugMode from "./hooks/useDebugMode";
import TrainScene from "./scenes/TrainScene";
import { CAMERA_POSITION } from "./config/scene";
import Overlay from "./ui/Overlay";
import type { StationProject } from "./ui/types";

export type { StationProject };

// Full-screen train scene. Append #debug to the URL to show the Leva panel.
// Content comes in as props: the page reads it on the server.
export default function Experience({
  projects,
}: {
  projects: StationProject[];
}) {
  const debug = useDebugMode();

  return (
    <TrainProvider>
      {/* Always mounted: without a <Leva>, useControls auto-mounts its own
          visible panel. */}
      <Leva collapsed hidden={!debug} />
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
        <TrainScene projects={projects} />
      </Canvas>
      <Overlay projects={projects} />
    </TrainProvider>
  );
}
