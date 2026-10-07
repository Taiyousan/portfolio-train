import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";

const format = (v: THREE.Vector3) =>
  `[${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}]`;

// DISPOSABLE, to remove once the shots are settled (and its line in
// Overlay): the camera's live position, target, focal offset and field of
// view, with "#cam" in the URL, to pick shots on a phone (Leva's monitor,
// with "#debug", is unwieldy there). A tap selects it all, to copy.
export default function CameraReadout() {
  const { cameraControlsRef, mode, stop, workshopView, boardFocused } =
    useTrainContext();
  const textRef = useRef<HTMLPreElement>(null);

  // Written straight into the DOM every frame, not through React.
  useEffect(() => {
    const position = new THREE.Vector3();
    const target = new THREE.Vector3();
    const offset = new THREE.Vector3();
    let frame = requestAnimationFrame(function tick() {
      const controls = cameraControlsRef.current;
      const text = textRef.current;
      if (controls && text) {
        const camera = controls.camera;
        const fov =
          camera instanceof THREE.PerspectiveCamera
            ? `${camera.fov.toFixed(1)}°`
            : "–";
        text.textContent = [
          `position: ${format(controls.getPosition(position))}`,
          `target:   ${format(controls.getTarget(target))}`,
          `offset:   ${format(controls.getFocalOffset(offset))}`,
          `fov ${fov} · ${innerWidth}×${innerHeight}`,
        ].join("\n");
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [cameraControlsRef]);

  const screen =
    mode === "custom"
      ? `atelier · ${workshopView}`
      : `${mode} · ${stop}${boardFocused ? " · tableau" : ""}`;

  return (
    <div className="pointer-events-auto absolute top-[4.25rem] left-3 max-w-[calc(100%-1.5rem)] rounded-md bg-board/85 px-2.5 py-2 font-mono text-[0.625rem] leading-snug text-board-ink select-all sm:top-24 sm:left-5">
      <p className="opacity-70">{screen}</p>
      <pre ref={textRef} className="whitespace-pre-wrap" />
    </div>
  );
}
