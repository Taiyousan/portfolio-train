import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useTrainContext } from "../state/TrainContext";
import { mixColor } from "../hooks/useSeason";

// Puffs of each cloud shape, [x, y, z, radius], about 3 long.
const SHAPES: [number, number, number, number][][] = [
  [
    [0, 0.35, 0, 0.55],
    [0.62, 0.2, 0.05, 0.42],
    [-0.6, 0.18, 0, 0.45],
    [0.25, 0.6, -0.05, 0.4],
    [-1.05, 0.05, 0.05, 0.3],
    [1.05, 0.05, 0, 0.3],
  ],
  [
    [0, 0.3, 0, 0.48],
    [-0.5, 0.45, 0.05, 0.42],
    [0.5, 0.15, 0, 0.38],
    [-0.95, 0.1, 0, 0.32],
    [0.9, 0.05, 0.05, 0.25],
  ],
  [
    [0, 0.25, 0, 0.42],
    [0.45, 0.4, 0, 0.36],
    [-0.4, 0.15, 0.05, 0.34],
    [0.85, 0.1, 0, 0.26],
  ],
];

const COUNT = 14;
// Far off past the forest, mostly on the side the camera looks at (+x).
const DISTANCE: [number, number] = [55, 95];
const FAR_SIDE_SHARE = 0.75;
// Their height, as an angle above the camera's horizon.
const ELEVATION: [number, number] = [5, 13];
const SIZE: [number, number] = [3, 5.5];
// They wrap round along z over this length, beyond the far plane's reach.
const LOOP = 200;
// They drift back at this fraction of the train's speed (parallax), plus a
// breeze of their own.
const PARALLAX = 0.04;
const BREEZE = 0.25;

const rand = ([min, max]: [number, number]) => min + Math.random() * (max - min);

function randomClouds() {
  return Array.from({ length: COUNT }, (_, i) => {
    const side = Math.random() < FAR_SIDE_SHARE ? 1 : -1;
    const distance = rand(DISTANCE);
    const elevation = THREE.MathUtils.degToRad(rand(ELEVATION));
    const size = rand(SIZE);
    return {
      shape: i % SHAPES.length,
      position: [
        side * distance,
        distance * Math.tan(elevation),
        (i / COUNT - 0.5) * LOOP + Math.random() * 6,
      ] as [number, number, number],
      // Long side mostly along the track, facing the camera.
      rotationY: (Math.random() - 0.5) * 0.6,
      scale: [size * 1.4, size, size] as [number, number, number],
    };
  });
}

// Puffy cartoon clouds in the sky, drifting slowly along. Out of the fog,
// which would hide them, and lit by a glow of their own in the season's
// colour (warm at dusk, grey-blue in winter) so they never go dark.
export default function Clouds() {
  const { trainSpeedRef, seasonWeightsRef } = useTrainContext();
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const geometries = useMemo(
    () =>
      SHAPES.map((puffs) => {
        const geometry = mergeGeometries(
          puffs.map(([x, y, z, radius]) =>
            new THREE.SphereGeometry(radius, 16, 12).translate(x, y, z),
          ),
        );
        // Flattened underneath.
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
          const y = position.getY(i);
          if (y < 0) position.setY(i, y * 0.3);
        }
        geometry.computeVertexNormals();
        return geometry;
      }),
    [],
  );
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 1,
        fog: false,
        emissiveIntensity: 0.45,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometries.forEach((geometry) => geometry.dispose());
      material.dispose();
    },
    [geometries, material],
  );

  const clouds = useMemo(() => randomClouds(), []);

  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((_, delta) => {
    mixColor(seasonWeightsRef.current, "clouds", material.color);
    material.emissive.copy(material.color);
    const drift =
      delta * (trainSpeedRef.current * PARALLAX + (reducedMotion ? 0 : BREEZE));
    refs.current.forEach((mesh) => {
      if (!mesh) return;
      mesh.position.z -= drift;
      if (mesh.position.z < -LOOP / 2) mesh.position.z += LOOP;
    });
  });

  return (
    <group>
      {clouds.map((cloud, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            refs.current[i] = mesh;
          }}
          geometry={geometries[cloud.shape]}
          material={material}
          position={cloud.position}
          rotation-y={cloud.rotationY}
          scale={cloud.scale}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
