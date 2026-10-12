"use client";

import {
  Component,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { TrainProvider } from "./state/TrainContext";
import { LiveryProvider } from "./state/LiveryContext";
import useDebugMode from "./hooks/useDebugMode";
import useWebGLSupport from "./hooks/useWebGLSupport";
import Overlay from "./ui/Overlay";
import LoadingScreen from "./ui/LoadingScreen";
import ErrorReadout from "./debug/ErrorReadout";
import type { StationProject } from "./ui/types";
import type { SceneProps } from "./Scene";

export type { StationProject };

// Leva, only in debug mode.
const DebugPanel = dynamic(() => import("./debug/DebugPanel"), { ssr: false });

// Full-screen train scene. `children` is the page's plain HTML version,
// first in reading order (screen readers, crawlers) but out of sight until
// it holds keyboard focus, then shown over the scene. Shown on its own
// instead without WebGL 2, or if the scene fails to load or run. Append
// #debug to the URL for the Leva panel and a free camera.
export default function Experience({
  projects,
  children,
}: {
  projects: StationProject[];
  children: ReactNode;
}) {
  const webgl = useWebGLSupport();
  const debug = useDebugMode();
  const [progress, setProgress] = useState(0);
  // The loading screen has started fading onto the scene.
  const [boarded, setBoarded] = useState(false);
  // three.js comes in its own chunk, downloaded once the page is up: the
  // loading screen and the HTML version work meanwhile. Not through
  // next/dynamic: its Suspense remounts the canvas in development (strict
  // mode), which loses its WebGL context for good.
  const [Scene, setScene] = useState<ComponentType<SceneProps> | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    if (!webgl) return;
    import("./Scene").then(
      (module) => setScene(() => module.default),
      // Rendered, it throws, and SceneBoundary falls back to the HTML.
      (error) =>
        setScene(() => () => {
          throw error;
        }),
    );
  }, [webgl]);

  const readout = debug && (
    <ErrorReadout
      webgl={webgl}
      sceneLoaded={Scene !== null}
      progress={progress}
      failure={failure}
    />
  );

  if (!webgl) {
    return (
      <>
        {children}
        {readout}
      </>
    );
  }

  return (
    <>
      <SceneBoundary fallback={children} onError={setFailure}>
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
              {debug && <DebugPanel />}
              {Scene && <Scene projects={projects} onProgress={setProgress} />}
              <Overlay projects={projects} boarded={boarded} />
              <LoadingScreen
                progress={progress}
                onBoarded={() => setBoarded(true)}
              />
            </LiveryProvider>
          </TrainProvider>
        </div>
      </SceneBoundary>
      {readout}
    </>
  );
}

// Falls back to the HTML version alone if the scene throws (a chunk that
// doesn't download, a GPU that gives up).
class SceneBoundary extends Component<
  {
    fallback: ReactNode;
    onError: (message: string) => void;
    children: ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error instanceof Error ? error.message : String(error));
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
