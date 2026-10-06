"use client";

import { useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { TrainProvider } from "./state/TrainContext";
import { LiveryProvider } from "./state/LiveryContext";
import useDebugMode from "./hooks/useDebugMode";
import useWebGLSupport from "./hooks/useWebGLSupport";
import TrainScene from "./scenes/TrainScene";
import { CAMERA_POSITION } from "./config/scene";
import Overlay from "./ui/Overlay";
import LoadingScreen from "./ui/LoadingScreen";
import type { StationProject } from "./ui/types";

export type { StationProject };

// Full-screen train scene. Append #debug to the URL to show the Leva panel.
// Content comes in as props: the page reads it on the server. `children` is
// the page's plain HTML version, first in reading order (screen readers,
// crawlers) but out of sight, until it holds keyboard focus: then it's
// shown over the scene. Without WebGL, it's shown on its own instead.
export default function Experience({
  projects,
  children,
}: {
  projects: StationProject[];
  children: ReactNode;
}) {
  const webgl = useWebGLSupport();
  const debug = useDebugMode();
  // The loading screen has started fading onto the scene.
  const [boarded, setBoarded] = useState(false);

  if (!webgl) return children;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background not-focus-within:sr-only">
        <p className="border-b border-line px-5 py-3 font-mono text-sm text-muted">
          Version texte du portfolio ·{" "}
          <a href="#train" className="text-accent underline">
            passer au train
          </a>
        </p>
        {children}
      </div>
      {/* Focused by the link above, so the next Tab goes on into the
          overlay. */}
      <div
        id="train"
        tabIndex={-1}
        className="fixed inset-0 bg-[#3a2a1f] outline-none"
      >
        <TrainProvider>
          <LiveryProvider>
            {/* Always mounted: without a <Leva>, useControls auto-mounts its
                own visible panel. */}
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
            <Overlay projects={projects} boarded={boarded} />
            <LoadingScreen onBoarded={() => setBoarded(true)} />
          </LiveryProvider>
        </TrainProvider>
      </div>
    </>
  );
}
