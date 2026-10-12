import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls, Environment, Sky } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import * as THREE from "three";
import type { BloomEffect } from "postprocessing";
import { useTrainContext, type WorkshopView } from "../state/TrainContext";
import useTrainSpeedEasing from "../hooks/useTrainSpeedEasing";
import useStopApproach from "../hooks/useStopApproach";
import useShaderWarmup from "../hooks/useShaderWarmup";
import useDebugMode from "../hooks/useDebugMode";
import { useTweaks } from "../debug/tweaks";
import { mixColor, mixValue, useSeasonEasing } from "../hooks/useSeason";
import Station from "../models/Station";
import Home from "../models/Home";
import Train from "../models/Train";
import Rails from "../models/Rails";
import Smoke from "../models/Smoke";
import Forest from "../models/Forest";
import ForestFloor from "../models/ForestFloor";
import Snowfall from "../models/Snowfall";
import Clouds from "../models/Clouds";
import Bunny from "../models/Bunny";
import Bird from "../models/Bird";
import type { StationProject } from "../ui/types";
import {
  BOARD_CAMERA,
  BOARD_PHONE_CAMERA,
  CAMERA_FOV,
  CUSTOM_CAMERAS,
  ENVIRONMENT_MAP,
  FIT_ASPECT,
  GLARE_EASING,
  MAX_FOV,
  PHONE_BREAKPOINT,
  RIDE_CAMERA,
  STOP_SETTLE_MS,
  STOP_CAMERAS,
  SUN_POSITION,
  WORKSHOP_FRAME,
  WORKSHOP_GLARE,
  type CameraShot,
} from "../config/scene";

// The camera's vertical field of view on a `width` × `height` pixel
// screen, in degrees: CAMERA_FOV, widened on screens narrower than
// FIT_ASPECT so they see as wide as one of those, up to MAX_FOV.
function fittedFov(width: number, height: number) {
  const aspect = width / Math.max(height, 1);
  if (aspect >= FIT_ASPECT) return CAMERA_FOV;
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);
  const fov = 2 * Math.atan((halfHeight * FIT_ASPECT) / aspect);
  return Math.min(THREE.MathUtils.radToDeg(fov), MAX_FOV);
}

// The workshop's shot of `view` on a `width` × `height` pixel screen, with
// a `fov` degree camera (see WORKSHOP_FRAME): pulled back along its line of
// sight until its subject fits in the room the panel leaves, and the focal
// offset (world units, along the camera's right and down) that centres the
// subject in that room.
function workshopShot(
  view: WorkshopView,
  width: number,
  height: number,
  fov: number,
) {
  const base = CUSTOM_CAMERAS[view];
  const phone = width < PHONE_BREAKPOINT;
  const panel = phone
    ? { x: 0, y: height * WORKSHOP_FRAME.sheet }
    : { x: WORKSHOP_FRAME.width, y: 0 };
  const target = new THREE.Vector3(...base.target);
  const line = new THREE.Vector3(...base.position).sub(target);
  // World units seen per pixel, per unit of distance.
  const perPixel = (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)) / height;
  const subject = WORKSHOP_FRAME.subject[view];
  const distance = Math.max(
    line.length(),
    subject.width / (perPixel * Math.max(width - panel.x, 1)),
    subject.height / (perPixel * Math.max(height - panel.y, 1)),
  );
  line.setLength(distance);
  const shot: CameraShot = {
    position: target.clone().add(line).toArray(),
    target: base.target,
  };
  const offset = distance * perPixel;
  return {
    shot,
    offsetX: (panel.x / 2) * offset,
    offsetY: (panel.y / 2) * offset,
  };
}

// Inside the scene's Suspense, so it runs once everything has loaded.
function ShaderWarmup({
  stationRef,
  homeRef,
}: {
  stationRef: RefObject<THREE.Group | null>;
  homeRef: RefObject<THREE.Group | null>;
}) {
  useShaderWarmup(stationRef, homeRef);
  return null;
}

// Last in the scene's Suspense: once it has drawn a few frames, the loading
// screen can go.
const READY_FRAMES = 3;
function SceneReady() {
  const { setReady } = useTrainContext();
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === READY_FRAMES) setReady(true);
  });
  return null;
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
    workshopView,
    seasonWeightsRef,
  } = useTrainContext();
  const debug = useDebugMode();

  const {
    trainSpeed: targetTrainSpeed,
    fogDensity,
    lightIntensity,
    bloomIntensity,
    vignetteDarkness,
  } = useTweaks("Scene", {
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

  // Haze, light, sky and bloom follow the blended season (config/seasons),
  // the fog and light settings scaled by it.
  useSeasonEasing();
  const fogRef = useRef<THREE.FogExp2>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const skyRef = useRef<ComponentRef<typeof Sky>>(null);
  const bloomRef = useRef<BloomEffect>(null);
  // 1 in the workshop, 0 elsewhere, eased (see WORKSHOP_GLARE).
  const glareRef = useRef(0);
  useFrame(({ scene }, delta) => {
    const weights = seasonWeightsRef.current;
    const glare =
      glareRef.current +
      ((mode === "custom" ? 1 : 0) - glareRef.current) *
        (1 - Math.exp(-GLARE_EASING * delta));
    glareRef.current = glare;
    if (scene.background instanceof THREE.Color) {
      mixColor(weights, "haze", scene.background);
    }
    const fog = fogRef.current;
    if (fog) {
      mixColor(weights, "haze", fog.color);
      fog.density = fogDensity * mixValue(weights, "fogScale");
    }
    const ambient = ambientRef.current;
    if (ambient) {
      mixColor(weights, "ambient", ambient.color);
      ambient.intensity = mixValue(weights, "ambientIntensity");
    }
    const sun = sunRef.current;
    if (sun) {
      mixColor(weights, "sun", sun.color);
      sun.intensity = lightIntensity * mixValue(weights, "sunScale");
    }
    const sky = skyRef.current?.material;
    if (sky) {
      sky.uniforms.turbidity.value = mixValue(weights, "turbidity");
      sky.uniforms.rayleigh.value = mixValue(weights, "rayleigh");
      sky.uniforms.mieCoefficient.value =
        mixValue(weights, "mieCoefficient") * (1 - WORKSHOP_GLARE.mie * glare);
    }
    if (bloomRef.current) {
      bloomRef.current.intensity =
        bloomIntensity * (1 - WORKSHOP_GLARE.bloom * glare);
      bloomRef.current.luminanceMaterial.threshold = mixValue(
        weights,
        "bloomThreshold",
      );
    }
  });

  // At a stop, the wide arrival shot holds for a moment before settling on
  // the stop's view.
  const [stopSettled, setStopSettled] = useState(false);

  // Narrow screens see wider (see fittedFov).
  const { width, height } = useThree((state) => state.size);
  const getState = useThree((state) => state.get);
  const fov = fittedFov(width, height);
  useLayoutEffect(() => {
    const { camera } = getState();
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [getState, fov]);

  // The workshop's shot is fitted to the screen, the others are fixed
  // (phones have their own): memoised so that resizing only reframes the
  // workshop.
  const phone = width < PHONE_BREAKPOINT;
  const workshop = useMemo(
    () =>
      mode === "custom" ? workshopShot(workshopView, width, height, fov) : null,
    [mode, workshopView, width, height, fov],
  );
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
    const shot = workshop
      ? workshop.shot
      : stopped && stop === "station" && boardFocused
        ? phone
          ? BOARD_PHONE_CAMERA
          : BOARD_CAMERA
        : stopped && stopSettled
          ? phone
            ? shots.phone
            : shots.view
          : mode === "arriving" || stopped
            ? shots.arrival
            : RIDE_CAMERA;
    const controls = cameraControlsRef.current;
    controls?.setLookAt(...shot.position, ...shot.target, true);
    const [offsetX, offsetY, offsetZ] = workshop
      ? [workshop.offsetX, workshop.offsetY, 0]
      : (shot.offset ?? [0, 0, 0]);
    controls?.setFocalOffset(offsetX, offsetY, offsetZ, true);
  }, [
    mode,
    stop,
    boardFocused,
    workshop,
    stopSettled,
    phone,
    cameraControlsRef,
  ]);

  return (
    <>
      {/* Colours and intensities are set every frame from the season. */}
      <fogExp2 ref={fogRef} attach="fog" args={["#3a2a1f", 0.04]} />

      <ambientLight ref={ambientRef} />
      <directionalLight
        ref={sunRef}
        position={SUN_POSITION}
        castShadow
        shadow-mapSize={[2048, 2048]}
        // Low sun, flat-shaded faces: without these, faces facing it shadow
        // themselves in stripes (shadow acne).
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={1}
        shadow-camera-far={150}
      />
      <Sky ref={skyRef} sunPosition={SUN_POSITION} mieDirectionalG={0.9} />

      {/* Moves the camera between shots; turned by hand in debug mode only,
          to frame new ones. */}
      <CameraControls ref={cameraControlsRef} enabled={debug} />

      <EffectComposer>
        <Bloom
          ref={bloomRef}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          intensity={bloomIntensity}
          mipmapBlur
        />
        <Vignette offset={0.3} darkness={vignetteDarkness} />
        <Noise opacity={0.02} />
      </EffectComposer>

      {/* Everything that loads, in here: left to the canvas, a pending
          load suspends the page around it. */}
      <Suspense fallback={null}>
        <Environment files={ENVIRONMENT_MAP} />
        <Train />
        <ForestFloor position={[0, -0.6, 0]} />
        <Rails position={[0, -0.57, 0]} />
        <Forest position={[0, -0.58, 0]} stops={[stationRef, homeRef]} />
        <Bunny position={[0, -0.58, 0]} />
        <Bird />
        <Clouds />
        <Smoke />
        <Snowfall />
        <Station ref={stationRef} projects={projects} />
        <Home ref={homeRef} />
        {/* Last, so the stops are in the scene when they run. */}
        <ShaderWarmup stationRef={stationRef} homeRef={homeRef} />
        <SceneReady />
      </Suspense>
    </>
  );
}
