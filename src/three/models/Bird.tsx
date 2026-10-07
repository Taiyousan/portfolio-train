import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_POSITION, STOP_SIDE } from "../config/scene";
import { useTrainContext } from "../state/TrainContext";

const COLORS = {
  body: "#3d4f6e",
  wing: "#2f3d57",
  belly: "#e9dcc4",
  beak: "#f0a050",
};

// World units per bird unit (its wingspan is about 1.8).
const SCALE = 1.2;
// Seconds between two passes, and before the first.
const WAIT: [number, number] = [12, 28];
const FIRST_WAIT: [number, number] = [4, 10];
// It flies along the track, across the whole view, far past the trees
// behind the train (distance from the track), just under the ride shot's
// top edge (its height as an angle above the camera's horizon, the edge
// at about 11.7°, under the page header): that far, it's then above the tallest trees (world
// height, the forest's tops reach about 4.6), only ever passing behind
// the crowns of the nearest.
const DISTANCE: [number, number] = [22, 30];
const ANGLE: [number, number] = [7, 9];
const ABOVE_TREES = 5;
const CROSS_Z = 26;
// World units per second, over the ground: on screen, the forest scrolls
// past at the train's speed, so it outruns the train slowly flying with it,
// and fast flying the other way. Never slower than MIN_PASS on screen,
// though, nor ever left behind by a fast train.
const SPEED: [number, number] = [6, 8];
const MIN_PASS = 2.5;
const FLAP_RATE = 11;

const rand = ([min, max]: [number, number]) => min + Math.random() * (max - min);

type Flight = {
  active: boolean;
  wait: number;
  x: number;
  y: number;
  z: number;
  // +1 or -1 along z.
  direction: number;
  speed: number;
  // Wing beat phase, and time left gliding (wings held out) or flapping.
  phase: number;
  glide: number;
  flap: number;
};

// A bird flying past now and then, high over the forest behind the train:
// flapping, gliding a moment, flapping again. Out of the fog, which would
// wash it out that far. Not shown with reduced motion.
export default function Bird() {
  const { trainSpeedRef } = useTrainContext();
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [firstWait] = useState(() => rand(FIRST_WAIT));
  const flightRef = useRef<Flight>({
    active: false,
    wait: firstWait,
    x: 0,
    y: 0,
    z: 0,
    direction: 1,
    speed: 0,
    phase: 0,
    glide: 0,
    flap: 0,
  });
  const groupRef = useRef<THREE.Group>(null);
  const wingRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }, delta) => {
    const flight = flightRef.current;
    const group = groupRef.current;
    if (!group || reducedMotion) return;

    if (!flight.active) {
      flight.wait -= delta;
      if (flight.wait > 0) return;
      const distance = rand(DISTANCE);
      const fromCamera = distance - CAMERA_POSITION[0] * STOP_SIDE;
      const angle = THREE.MathUtils.degToRad(rand(ANGLE));
      const height = CAMERA_POSITION[1] + fromCamera * Math.tan(angle);
      flight.active = true;
      flight.direction = Math.random() < 0.5 ? 1 : -1;
      flight.x = STOP_SIDE * distance;
      flight.y = Math.max(height, ABOVE_TREES);
      flight.z = -flight.direction * CROSS_Z;
      flight.speed = rand(SPEED);
      flight.glide = 0;
      flight.flap = rand([1, 2.5]);
    }

    // The train runs toward +z.
    const pass = Math.max(
      flight.speed - flight.direction * trainSpeedRef.current,
      MIN_PASS,
    );
    flight.z += flight.direction * pass * delta;
    if (Math.abs(flight.z) > CROSS_Z) {
      flight.active = false;
      flight.wait = rand(WAIT);
      group.visible = false;
      return;
    }

    // Flapping for a while, then a short glide.
    if (flight.glide > 0) {
      flight.glide -= delta;
      if (flight.glide <= 0) flight.flap = rand([1.2, 2.8]);
    } else {
      flight.phase += delta * FLAP_RATE;
      flight.flap -= delta;
      if (flight.flap <= 0) flight.glide = rand([0.6, 1.4]);
    }
    const gliding = flight.glide > 0;

    group.visible = true;
    group.position.set(
      flight.x,
      flight.y +
        Math.sin(clock.elapsedTime * 1.4) * 0.15 +
        (gliding ? 0 : Math.sin(flight.phase) * 0.05),
      flight.z,
    );
    group.rotation.y = flight.direction > 0 ? 0 : Math.PI;
    wingRefs.current.forEach((wing, i) => {
      if (!wing) return;
      const side = i === 0 ? -1 : 1;
      const angle = gliding ? 0.1 : Math.sin(flight.phase) * 0.7 + 0.1;
      wing.rotation.z = side * angle;
    });
  });

  return (
    <group ref={groupRef} visible={false} scale={SCALE}>
      <Part
        radius={0.2}
        position={[0, 0, 0]}
        scale={[0.85, 0.8, 1.45]}
        color={COLORS.body}
      />
      <Part
        radius={0.15}
        position={[0, -0.06, 0.06]}
        scale={[0.9, 0.7, 1.4]}
        color={COLORS.belly}
      />
      <Part radius={0.13} position={[0, 0.08, 0.27]} color={COLORS.body} />
      <mesh position={[0, 0.06, 0.42]} rotation-x={Math.PI / 2}>
        <coneGeometry args={[0.045, 0.11, 8]} />
        <meshStandardMaterial color={COLORS.beak} roughness={0.6} fog={false} />
      </mesh>
      <Part
        radius={0.14}
        position={[0, 0.03, -0.34]}
        scale={[1, 0.25, 1.3]}
        color={COLORS.wing}
        detail={8}
      />
      {/* Wings, pivoting at the shoulders. */}
      {[-1, 1].map((side, i) => (
        <group
          key={side}
          ref={(wing) => {
            wingRefs.current[i] = wing;
          }}
          position={[side * 0.1, 0.06, 0.02]}
        >
          <Part
            radius={0.3}
            position={[side * 0.38, 0, 0]}
            scale={[1.35, 0.12, 0.55]}
            color={COLORS.wing}
          />
        </group>
      ))}
    </group>
  );
}

function Part({
  radius,
  position,
  scale,
  color,
  detail = 12,
}: {
  radius: number;
  position: [number, number, number];
  scale?: [number, number, number];
  color: string;
  detail?: number;
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[radius, detail, Math.round(detail * 0.7)]} />
      <meshStandardMaterial color={color} roughness={0.8} fog={false} />
    </mesh>
  );
}
