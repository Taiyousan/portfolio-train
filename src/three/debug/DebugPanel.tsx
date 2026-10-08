import { useEffect } from "react";
import { Leva, monitor, useControls } from "leva";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import {
  getTweakSchema,
  setTweaks,
  useTweakFolders,
  type TweakValue,
} from "./tweaks";

// The Leva panel, loaded with #debug in the URL only: every folder of
// settings the scene has registered (see tweaks), and the camera's
// position and target, to copy into a CameraShot (config/scene) once
// framed by hand.
export default function DebugPanel() {
  const names = useTweakFolders();
  return (
    <>
      <Leva collapsed />
      {names.map((name) => (
        <TweakFolder key={name} name={name} />
      ))}
      <CameraMonitor />
    </>
  );
}

function TweakFolder({ name }: { name: string }) {
  const values = useControls(name, getTweakSchema(name)) as Record<
    string,
    TweakValue
  >;
  useEffect(() => setTweaks(name, values), [name, values]);
  return null;
}

const position = new THREE.Vector3();
const target = new THREE.Vector3();
const format = ({ x, y, z }: THREE.Vector3) =>
  `[${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}]`;

function CameraMonitor() {
  const { cameraControlsRef } = useTrainContext();
  // Read from Leva's polling, never while rendering.
  useControls("Camera", {
    // eslint-disable-next-line react-hooks/refs
    position: monitor(() => {
      const controls = cameraControlsRef.current;
      return controls ? format(controls.getPosition(position)) : "—";
    }),
    // eslint-disable-next-line react-hooks/refs
    target: monitor(() => {
      const controls = cameraControlsRef.current;
      return controls ? format(controls.getTarget(target)) : "—";
    }),
  });
  return null;
}
