import { useEffect, useState } from "react";

// With #debug in the URL: what the scene is up to and what went wrong, on
// screen, for devices without devtools at hand (phones). Errors, unhandled
// rejections and WebGL context losses, as they happen.
export default function ErrorReadout({
  webgl,
  sceneLoaded,
  progress,
  failure,
}: {
  webgl: boolean;
  sceneLoaded: boolean;
  progress: number;
  failure: string | null;
}) {
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    const start = performance.now();
    const add = (text: string) =>
      setEvents((list) => [
        ...list.slice(-7),
        `${((performance.now() - start) / 1000).toFixed(1)} s · ${text}`,
      ]);
    const onError = (e: ErrorEvent) => add(`erreur : ${e.message}`);
    const onRejection = (e: PromiseRejectionEvent) =>
      add(`promesse rejetée : ${e.reason?.message ?? String(e.reason)}`);
    const onLost = () => add("contexte WebGL perdu");
    const onRestored = () => add("contexte WebGL restauré");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    // Capture: these events don't bubble up from the canvas.
    window.addEventListener("webglcontextlost", onLost, true);
    window.addEventListener("webglcontextrestored", onRestored, true);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("webglcontextlost", onLost, true);
      window.removeEventListener("webglcontextrestored", onRestored, true);
    };
  }, []);

  const stage = !webgl
    ? "pas de WebGL 2"
    : failure
      ? `échec : ${failure}`
      : sceneLoaded
        ? `scène chargée, téléchargements ${Math.round(progress)} %`
        : "chargement du code de la scène";

  return (
    <div className="pointer-events-none fixed inset-x-2 bottom-2 z-[60] rounded-md bg-board/90 px-2.5 py-2 font-mono text-[0.625rem] leading-snug text-board-ink">
      <p>{stage}</p>
      {events.map((event, i) => (
        <p key={i}>{event}</p>
      ))}
      <p className="opacity-60">
        {window.devicePixelRatio}x · {navigator.userAgent}
      </p>
    </div>
  );
}
