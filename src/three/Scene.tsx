import { memo, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor, useProgress } from "@react-three/drei";
import TrainScene from "./scenes/TrainScene";
import { useTrainContext } from "./state/TrainContext";
import { CAMERA_FOV, CAMERA_POSITION } from "./config/scene";
import type { StationProject } from "./ui/types";

// Below this frame rate, held for a few seconds, the quality steps down.
const MIN_FPS = 40;
// Below this one at the lowest quality, the scene gives way to the HTML
// version.
const FALLBACK_FPS = 15;

// What the GPU is asked to draw: pixel ratio, the effect composer's
// multisampling, and bloom.
type Quality = { dpr: number; multisampling: number; bloom: boolean };

function initialQuality(): Quality {
  const dpr = Math.min(window.devicePixelRatio, 2);
  // On high-density screens, pixels too small for jagged edges to show:
  // multisampling would cost a lot for nothing.
  return { dpr, multisampling: dpr >= 2 ? 0 : 4, bloom: true };
}

// One step down, cheapest to the eye first: multisampling, then the
// resolution, half a step at a time down to 1, then bloom. Null at the
// lowest.
function lowerQuality(quality: Quality): Quality | null {
  if (quality.multisampling > 0) return { ...quality, multisampling: 0 };
  if (quality.dpr > 1) {
    return { ...quality, dpr: Math.max(1, quality.dpr - 0.5) };
  }
  if (quality.bloom) return { ...quality, bloom: false };
  return null;
}

export type SceneProps = {
  projects: StationProject[];
  // Gets the downloads' progress, 0 to 100.
  onProgress: (progress: number) => void;
  // No frames drawn, while hidden behind the HTML version.
  paused: boolean;
  // Called, with the reason, when the device can't run the scene even at
  // its lowest quality.
  onTooSlow: (reason: string) => void;
};

// The canvas and everything three.js, in a chunk of its own (see
// Experience).
function Scene({ projects, onProgress, paused, onTooSlow }: SceneProps) {
  const [quality, setQuality] = useState(initialQuality);

  return (
    <>
      <Progress onProgress={onProgress} />
      <Canvas
        // Variance shadows: blurred in the shadow map itself, so they stay
        // soft and steady as the world scrolls under the low sun (PCF's few
        // samples show the map's texels, which shimmer).
        shadows="variance"
        dpr={quality.dpr}
        // The effect composer multisamples (see Quality): the canvas needn't.
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{
          fov: CAMERA_FOV,
          near: 0.3,
          far: 150,
          position: CAMERA_POSITION,
        }}
      >
        <color args={["#3a2a1f"]} attach="background" />
        <Pause paused={paused} />
        <TrainScene
          projects={projects}
          multisampling={quality.multisampling}
          bloom={quality.bloom}
        />
        <AdaptiveQuality
          quality={quality}
          setQuality={setQuality}
          onTooSlow={onTooSlow}
        />
      </Canvas>
    </>
  );
}

// Stops the frames while `paused`, through the root's active flag rather
// than the frame loop: switching that restarts the clock at 0, which the
// scene's timers count on, and its last frames under "never" get a delta
// in milliseconds. On resuming, the time paused is left out of the next
// frame's delta.
function Pause({ paused }: { paused: boolean }) {
  const get = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const state = get();
    if (paused) {
      state.internal.active = false;
    } else if (!state.internal.active) {
      state.clock.getDelta();
      state.internal.active = true;
      invalidate();
    }
  }, [paused, get, invalidate]);
  return null;
}

// Reports the downloads' progress, apart from the canvas, which needn't
// re-render with every file loaded.
function Progress({ onProgress }: Pick<SceneProps, "onProgress">) {
  const progress = useProgress((state) => state.progress);
  useEffect(() => onProgress(progress), [progress, onProgress]);
  return null;
}

// Steps the quality down (see lowerQuality) on a device that can't keep up,
// and past the lowest, gives up on the scene if it's still under
// FALLBACK_FPS. Only once the scene is up: the frames building its shaders
// are slow anyway.
function AdaptiveQuality({
  quality,
  setQuality,
  onTooSlow,
}: {
  quality: Quality;
  setQuality: (quality: Quality) => void;
  onTooSlow: SceneProps["onTooSlow"];
}) {
  const { ready } = useTrainContext();
  if (!ready) return null;
  return (
    <PerformanceMonitor
      bounds={() => [MIN_FPS, Infinity]}
      onDecline={({ fps }) => {
        const lower = lowerQuality(quality);
        if (lower) setQuality(lower);
        else if (fps < FALLBACK_FPS) {
          onTooSlow(`trop lent : ${Math.round(fps)} i/s au plus bas`);
        }
      }}
    />
  );
}

export default memo(Scene);
