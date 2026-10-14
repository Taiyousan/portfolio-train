import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import { mixValue } from "../hooks/useSeason";
import {
  AUTUMN_LEAVES,
  RAIN_COLOR,
  SNOW_COLOR,
  type SeasonValue,
} from "../config/seasons";
import {
  createFallGeometry,
  createFallMaterial,
  updateFall,
  type FallLook,
} from "../shaders/fall";
import useReducedMotion from "../hooks/useReducedMotion";

// Box the points fall and wrap around in, from the ground (y = -0.6) up,
// wide and long enough to fill every camera shot.
const BOX = new THREE.Vector3(18, 6, 26);
const BOX_CENTER: [number, number, number] = [-1, -0.6 + BOX.y / 2, 0];

// Snowflakes in winter, leaves in autumn, rain: how many, how they look,
// how opaque at most, and the season value they fade in and out with.
const FALLS: Record<
  "snow" | "leaves" | "rain",
  FallLook & { count: number; opacity: number; season: SeasonValue }
> = {
  snow: {
    count: 6000,
    season: "snowfall",
    opacity: 1,
    colors: [SNOW_COLOR],
    size: 0.025,
    maxSize: 64,
    stretch: [1, 1],
    edge: 0.15,
    fall: 0.25,
    sway: 0.12,
    spin: 0,
  },
  leaves: {
    count: 400,
    season: "leaffall",
    opacity: 1,
    colors: AUTUMN_LEAVES,
    size: 0.09,
    maxSize: 22,
    stretch: [1, 2.2],
    edge: 0.42,
    fall: 0.16,
    sway: 0.35,
    spin: 1.5,
  },
  // Thin streaks, falling fast and straight.
  rain: {
    count: 3500,
    season: "rainfall",
    opacity: 0.55,
    colors: [RAIN_COLOR],
    size: 0.22,
    maxSize: 48,
    stretch: [9, 1],
    edge: 0.2,
    fall: 3,
    sway: 0,
    spin: 0,
  },
};

// Falling snow, leaves or rain, faded in and out with their season. None
// with reduced motion (the snow cover and the turned leaves stay).
export default function Fall({ look }: { look: keyof typeof FALLS }) {
  const { trainSpeedRef, seasonWeightsRef } = useTrainContext();
  const reducedMotion = useReducedMotion();
  const pointsRef = useRef<THREE.Points>(null);
  const fall = FALLS[look];

  const geometry = useMemo(
    () => createFallGeometry(fall.count, BOX, fall.colors),
    [fall],
  );
  const material = useMemo(() => createFallMaterial(BOX, fall), [fall]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ camera, size, viewport }, delta) => {
    const opacity = reducedMotion
      ? 0
      : mixValue(seasonWeightsRef.current, fall.season) * fall.opacity;
    const points = pointsRef.current;
    if (points) points.visible = opacity > 0;
    if (opacity === 0) return;

    const fov = THREE.MathUtils.degToRad(
      (camera as THREE.PerspectiveCamera).fov,
    );
    updateFall(material, {
      delta,
      // Points drift back with the world, at the train's speed.
      scrolled: delta * trainSpeedRef.current,
      opacity,
      scale: (size.height * viewport.dpr) / (2 * Math.tan(fov / 2)),
      dpr: viewport.dpr,
      maxSize: fall.maxSize,
    });
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      position={BOX_CENTER}
      frustumCulled={false}
      visible={false}
    />
  );
}
