import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import { mixValue } from "../hooks/useSeason";
import {
  createSnowfallGeometry,
  createSnowfallMaterial,
  updateSnowfall,
} from "../shaders/snowfall";

const FLAKE_COUNT = 6000;
// Box the flakes fall and wrap around in, from the ground (y = -0.6) up,
// wide and long enough to fill every camera shot.
const BOX = new THREE.Vector3(18, 6, 26);
const BOX_CENTER: [number, number, number] = [-1, -0.6 + BOX.y / 2, 0];

// Snowflakes in winter, faded in and out with the season's "snowfall".
// Hidden with reduced motion (the snow cover stays).
export default function Snowfall() {
  const { trainSpeedRef, seasonWeightsRef } = useTrainContext();
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => createSnowfallGeometry(FLAKE_COUNT, BOX), []);
  const material = useMemo(() => createSnowfallMaterial(BOX), []);
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
      : mixValue(seasonWeightsRef.current, "snowfall");
    const points = pointsRef.current;
    if (points) points.visible = opacity > 0;
    if (opacity === 0) return;

    const fov = THREE.MathUtils.degToRad(
      (camera as THREE.PerspectiveCamera).fov,
    );
    updateSnowfall(material, {
      delta,
      // Flakes drift back with the world, at the train's speed.
      scrolled: delta * trainSpeedRef.current,
      opacity,
      scale: (size.height * viewport.dpr) / (2 * Math.tan(fov / 2)),
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
