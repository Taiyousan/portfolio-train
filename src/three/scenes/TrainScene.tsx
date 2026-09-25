import { Suspense, useEffect, useRef, useState } from "react";
import { CameraControls, Environment, Html, Sky } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import { monitor, useControls } from "leva";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import useTrainSpeedEasing from "../hooks/useTrainSpeedEasing";
import useStopApproach from "../hooks/useStopApproach";
import Station from "../models/Station";
import Home from "../models/Home";
import Train from "../models/Train";
import Rails from "../models/Rails";
import Smoke from "../models/Smoke";
import Forest from "../models/Forest";
import ForestFloor from "../models/ForestFloor";
import type { StationProject } from "../ui/types";
import {
  BOARD_CAMERA,
  CUSTOM_CAMERA,
  RIDE_CAMERA,
  STOP_SETTLE_MS,
  STOP_CAMERAS,
  SUN_POSITION,
} from "../config/scene";

// Scratch vectors for the read-only camera monitor below — reused every
// poll instead of allocating, and module-level since only one TrainScene
// renders at a time.
const monitorPosition = new THREE.Vector3();
const monitorTarget = new THREE.Vector3();

function formatVec3(vec: THREE.Vector3) {
  return `[${vec.x.toFixed(3)}, ${vec.y.toFixed(3)}, ${vec.z.toFixed(3)}]`;
}

export default function TrainScene({
  projects,
}: {
  projects: StationProject[];
}) {
  const {
    cameraControlsRef,
    targetTrainSpeed: initialSpeed,
    setTargetTrainSpeed,
    mode,
    stop,
    boardFocused,
  } = useTrainContext();

  const {
    trainSpeed: targetTrainSpeed,
    fogDensity,
    lightIntensity,
    bloomIntensity,
    vignetteDarkness,
  } = useControls("Scene", {
    trainSpeed: { value: initialSpeed, min: 0, max: 20, step: 0.5 },
    fogDensity: { value: 0.04, min: 0, max: 0.15, step: 0.005 },
    lightIntensity: { value: 3, min: 0, max: 10, step: 0.1 },
    bloomIntensity: { value: 0.6, min: 0, max: 3, step: 0.05 },
    vignetteDarkness: { value: 0.6, min: 0, max: 1, step: 0.05 },
  });

  useEffect(
    () => setTargetTrainSpeed(targetTrainSpeed),
    [targetTrainSpeed, setTargetTrainSpeed],
  );
  useTrainSpeedEasing();
  const stationRef = useRef<THREE.Group>(null);
  const homeRef = useRef<THREE.Group>(null);
  useStopApproach(stationRef, homeRef);

  // Read-only, live in the Leva panel: orbit to a framing you like, then
  // copy these straight into a CameraShot in config/scene.ts. The ref reads
  // below only ever run from Leva's own polling interval, never during
  // render, so the react-hooks/refs warning doesn't apply here.
  useControls("Camera (lecture seule)", {
    // eslint-disable-next-line react-hooks/refs
    position: monitor(() => {
      const controls = cameraControlsRef.current;
      if (!controls) return "—";
      return formatVec3(controls.getPosition(monitorPosition));
    }),
    // eslint-disable-next-line react-hooks/refs
    target: monitor(() => {
      const controls = cameraControlsRef.current;
      if (!controls) return "—";
      return formatVec3(controls.getTarget(monitorTarget));
    }),
  });

  // At a stop, the wide arrival shot holds for a moment before settling on
  // the stop's view (see config/scene).
  const [stopSettled, setStopSettled] = useState(false);
  useEffect(() => {
    if (mode !== "stopped") return;
    const timer = setTimeout(() => setStopSettled(true), STOP_SETTLE_MS);
    return () => {
      clearTimeout(timer);
      setStopSettled(false);
    };
  }, [mode]);

  useEffect(() => {
    const stopped = mode === "stopped";
    const shots = STOP_CAMERAS[stop];
    const shot =
      mode === "custom"
        ? CUSTOM_CAMERA
        : stopped && stop === "station" && boardFocused
          ? BOARD_CAMERA
          : stopped && stopSettled
            ? shots.view
            : mode === "arriving" || stopped
              ? shots.arrival
              : RIDE_CAMERA;
    cameraControlsRef.current?.setLookAt(
      ...shot.position,
      ...shot.target,
      true,
    );
  }, [mode, stop, boardFocused, stopSettled, cameraControlsRef]);

  return (
    <>
      <fogExp2 attach="fog" args={["#3a2a1f", 0.04]} density={fogDensity} />

      <ambientLight intensity={0.25} color="#4a5a7a" />
      <directionalLight
        intensity={lightIntensity}
        color="#ffb56b"
        position={SUN_POSITION}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={1}
        shadow-camera-far={150}
      />
      <Environment preset="sunset" background={false} />
      <Sky
        sunPosition={SUN_POSITION}
        turbidity={10}
        rayleigh={1.2}
        mieCoefficient={0.05}
        mieDirectionalG={0.9}
      />

      <CameraControls ref={cameraControlsRef} />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          intensity={bloomIntensity}
          mipmapBlur
        />
        <Vignette offset={0.3} darkness={vignetteDarkness} />
        <Noise opacity={0.02} />
      </EffectComposer>

      <Suspense
        fallback={
          <Html center>
            <p className="text-sm whitespace-nowrap text-white/80">
              Chargement…
            </p>
          </Html>
        }
      >
        <Train />
        <ForestFloor position={[0, -0.6, 0]} />
        <Rails position={[0, -0.57, 0]} />
        <Forest position={[0, -0.58, 0]} />
        <Smoke />
        <Station ref={stationRef} projects={projects} />
        <Home ref={homeRef} />
      </Suspense>
    </>
  );
}
