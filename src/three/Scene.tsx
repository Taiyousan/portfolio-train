import {
  memo,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor, useProgress } from "@react-three/drei";
import TrainScene from "./scenes/TrainScene";
import { useTrainContext } from "./state/TrainContext";
import { CAMERA_FOV, CAMERA_POSITION } from "./config/scene";
import type { StationProject } from "./ui/types";

// Below this frame rate, held for a few seconds, the resolution steps down.
const MIN_FPS = 40;

export type SceneProps = {
  projects: StationProject[];
  // Gets the downloads' progress, 0 to 100.
  onProgress: (progress: number) => void;
};

// The canvas and everything three.js, in a chunk of its own (see
// Experience).
function Scene({ projects, onProgress }: SceneProps) {
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio, 2));

  return (
    <>
      <Progress onProgress={onProgress} />
      <Canvas
        shadows="percentage"
        dpr={dpr}
        // The effect composer renders multisampled: the canvas itself needn't.
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{
          fov: CAMERA_FOV,
          near: 0.3,
          far: 150,
          position: CAMERA_POSITION,
        }}
      >
        <color args={["#3a2a1f"]} attach="background" />
        <TrainScene projects={projects} />
        <AdaptiveResolution setDpr={setDpr} />
      </Canvas>
    </>
  );
}

// Reports the downloads' progress, apart from the canvas, which needn't
// re-render with every file loaded.
function Progress({ onProgress }: Pick<SceneProps, "onProgress">) {
  const progress = useProgress((state) => state.progress);
  useEffect(() => onProgress(progress), [progress, onProgress]);
  return null;
}

// Steps the resolution down, to 1 at most, on a device that can't keep up.
// Only once the scene is up: the frames building its shaders are slow
// anyway.
function AdaptiveResolution({
  setDpr,
}: {
  setDpr: Dispatch<SetStateAction<number>>;
}) {
  const { ready } = useTrainContext();
  if (!ready) return null;
  return (
    <PerformanceMonitor
      bounds={() => [MIN_FPS, Infinity]}
      onDecline={() =>
        setDpr((dpr) => (dpr > 1 ? Math.max(1, dpr - 0.5) : dpr))
      }
    />
  );
}

export default memo(Scene);
