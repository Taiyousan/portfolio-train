import { useRef, useState } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import type * as THREE from "three";

const UNIFORM = "#3d5a8a";
const TROUSERS = "#2b3a5c";
const HAIR = "#2a1d15";

// Sitting on a ledge: the body drops by this much, thighs rest along the
// ledge (forward, +z) and shins hang over its edge.
const SIT_DROP = 0.2;
const THIGH_LENGTH = 0.26;
const SHIN_LENGTH = 0.3;
const HIP_X = 0.07;

// Seat depth the thighs take up: place a sitting driver this far back from
// the ledge's edge (in driver units) so the knees land on it.
export const DRIVER_SEAT_DEPTH = THIGH_LENGTH;
// Seat height that puts a sitting driver's feet on the floor, in driver
// units: the bottom of the shins.
export const DRIVER_SEAT_HEIGHT = SHIN_LENGTH - 0.06;

// Typing: forearms held out over a keyboard (see DRIVER_SEAT_HEIGHT and
// Home's desk), each tapping in turn.
const TYPING_TILT = -1.2;
const TAP_AMPLITUDE = 0.06;
const TAP_SPEED = 14;

type Props = ThreeElements["group"] & {
  // "standing": feet at the origin. "sitting": seat at the origin, facing
  // +z, legs dangling below it past z = DRIVER_SEAT_DEPTH.
  pose?: "standing" | "sitting";
  // The driver's cap; off at home, where the driver is just the developer.
  cap?: boolean;
  // Hands over a keyboard in front, tapping (held still with reduced
  // motion).
  typing?: boolean;
};

// A small stylized driver figure: standing in the locomotive cab, sitting
// on the platform's edge while the train waits at the station, or at the
// desk at home, cap off, typing.
export default function Driver({
  pose = "standing",
  cap = true,
  typing = false,
  ...props
}: Props) {
  const sitting = pose === "sitting";
  const bodyY = sitting ? -SIT_DROP : 0;
  // Arms hang slightly back standing, reach forward to the knees sitting,
  // further out to a keyboard typing.
  const armTilt = typing ? TYPING_TILT : sitting ? -0.7 : 0.4;

  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useFrame(({ clock }) => {
    if (!typing || reducedMotion) return;
    const phase = clock.elapsedTime * TAP_SPEED;
    // Out of step, and not quite in rhythm, like actual typing.
    leftArmRef.current?.rotation.set(
      armTilt + TAP_AMPLITUDE * Math.max(0, Math.sin(phase)),
      0,
      0.3,
    );
    rightArmRef.current?.rotation.set(
      armTilt + TAP_AMPLITUDE * Math.max(0, Math.sin(phase * 1.3 + 2)),
      0,
      -0.3,
    );
  });

  return (
    <group {...props}>
      {sitting ? (
        [-HIP_X, HIP_X].map((x) => (
          <group key={x}>
            {/* thigh */}
            <mesh
              castShadow
              position={[x, 0.06, THIGH_LENGTH / 2]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.065, 0.065, THIGH_LENGTH, 10]} />
              <meshStandardMaterial color={TROUSERS} roughness={0.8} />
            </mesh>
            {/* shin */}
            <mesh
              castShadow
              position={[x, 0.06 - SHIN_LENGTH / 2, THIGH_LENGTH]}
            >
              <cylinderGeometry args={[0.06, 0.055, SHIN_LENGTH, 10]} />
              <meshStandardMaterial color={TROUSERS} roughness={0.8} />
            </mesh>
          </group>
        ))
      ) : (
        <mesh castShadow position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.11, 0.13, 0.32, 10]} />
          <meshStandardMaterial color={TROUSERS} roughness={0.8} />
        </mesh>
      )}

      <group position={[0, bodyY, 0]}>
        {/* torso */}
        <mesh castShadow position={[0, 0.46, 0]}>
          <capsuleGeometry args={[0.15, 0.3, 4, 10]} />
          <meshStandardMaterial color={UNIFORM} roughness={0.75} />
        </mesh>

        {/* arms */}
        <mesh
          ref={rightArmRef}
          castShadow
          position={[0.19, 0.5, 0.06]}
          rotation={[armTilt, 0, -0.3]}
        >
          <capsuleGeometry args={[0.05, 0.26, 4, 8]} />
          <meshStandardMaterial color={UNIFORM} roughness={0.75} />
        </mesh>
        <mesh
          ref={leftArmRef}
          castShadow
          position={[-0.19, 0.5, 0.06]}
          rotation={[armTilt, 0, 0.3]}
        >
          <capsuleGeometry args={[0.05, 0.26, 4, 8]} />
          <meshStandardMaterial color={UNIFORM} roughness={0.75} />
        </mesh>

        {/* head */}
        <mesh castShadow position={[0, 0.78, 0]}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshStandardMaterial color="#e2b48c" roughness={0.9} />
        </mesh>

        {cap ? (
          <>
            {/* cap */}
            <mesh castShadow position={[0, 0.89, 0]}>
              <cylinderGeometry args={[0.145, 0.145, 0.1, 12]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
            </mesh>
            <mesh castShadow position={[0, 0.845, 0.13]} rotation={[0.3, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.02, 12]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
            </mesh>
          </>
        ) : (
          // hair: a cap of its own, tipped back off the face
          <mesh castShadow position={[0, 0.79, -0.01]} rotation={[-0.35, 0, 0]}>
            <sphereGeometry args={[0.148, 12, 8, 0, Math.PI * 2, 0, 1.5]} />
            <meshStandardMaterial color={HAIR} roughness={0.9} />
          </mesh>
        )}
      </group>
    </group>
  );
}
