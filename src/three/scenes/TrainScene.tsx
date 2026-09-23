import { Suspense, useEffect } from "react";
import { CameraControls, Environment, Html, Sky } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import { useControls } from "leva";
import { useTrainContext } from "../state/TrainContext";
import Train from "../models/Train";
import Rails from "../models/Rails";
import Smoke from "../models/Smoke";
import Forest from "../models/Forest";
import ForestFloor from "../models/ForestFloor";

// Low sun behind the train, warm dusk mood.
const SUN_POSITION: [number, number, number] = [-30, 6, -20];

export default function TrainScene() {
  const { cameraControlsRef, trainSpeed: initialSpeed, setTrainSpeed } =
    useTrainContext();

  const {
    trainSpeed,
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

  useEffect(() => setTrainSpeed(trainSpeed), [trainSpeed, setTrainSpeed]);

  return (
    <>
      <fogExp2
        attach="fog"
        args={["#3a2a1f", 0.04]}
        density={fogDensity}
      />

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
      </Suspense>
    </>
  );
}
