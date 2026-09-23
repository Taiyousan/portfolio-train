import { forwardRef, useImperativeHandle, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { animated, useSpring } from "@react-spring/three";
import type * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import { STATION_SIDE } from "../config/scene";

const PLATFORM_LENGTH = 6;
const PLATFORM_WIDTH = 1.4;
const PLATFORM_HEIGHT = 0.35;
// The building starts popping once the platform is this close to its stop.
const POP_DISTANCE = 2;
const BUILDING_WIDTH = 1.2;
const BUILDING_LENGTH = 3.4;
const BUILDING_HEIGHT = 1.1;
const POST_XS = [-0.4, 0.4] as const;
const POST_ZS = [-2.2, 2.2] as const;

// Placeholder station built from primitives, on the +x side of the track so
// the camera (on -x) sees it behind the train. Its group is moved along z by
// useStationApproach. Track is at y = -0.57 (see TrainScene), so the
// platform sits on the ground at that level.
const Station = forwardRef<THREE.Group>(function Station(_, ref) {
  const { mode } = useTrainContext();
  // The building pops in with an elastic overshoot once the train has
  // stopped, and shrinks away again as soon as it departs. Scaled from its
  // base so it grows out of the ground.
  const [{ scale }, api] = useSpring(() => ({
    scale: 0,
    config: { mass: 1, tension: 220, friction: 9, precision: 0.001 },
  }));
  const groupRef = useRef<THREE.Group>(null);
  useImperativeHandle(ref, () => groupRef.current!, []);
  const shownRef = useRef(false);

  // Pops just before the train has fully stopped, so the overshoot lands as
  // it comes to rest.
  useFrame(() => {
    const z = groupRef.current?.position.z ?? Infinity;
    const show =
      mode === "station" || (mode === "arriving" && z < POP_DISTANCE);
    if (show !== shownRef.current) {
      shownRef.current = show;
      api.start({ scale: show ? 1 : 0 });
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <group position={[3.2 * STATION_SIDE, -0.57, 0]}>
        <mesh position={[0, PLATFORM_HEIGHT / 2, 0]} castShadow receiveShadow>
          <boxGeometry
            args={[PLATFORM_WIDTH, PLATFORM_HEIGHT, PLATFORM_LENGTH]}
          />
          <meshStandardMaterial color="#8a7a68" roughness={0.9} />
        </mesh>
        {/* Yellow safety edge along the track side */}
        <mesh
          position={[-PLATFORM_WIDTH / 2 + 0.1, PLATFORM_HEIGHT + 0.005, 0]}
        >
          <boxGeometry args={[0.2, 0.01, PLATFORM_LENGTH]} />
          <meshStandardMaterial color="#d9a441" roughness={0.6} />
        </mesh>
        {POST_ZS.flatMap((z) =>
          POST_XS.map((x) => (
            <mesh
              key={`${x}:${z}`}
              position={[x, PLATFORM_HEIGHT + 0.65, z]}
              castShadow
            >
              <boxGeometry args={[0.07, 1.3, 0.07]} />
              <meshStandardMaterial color="#3b2f28" roughness={0.8} />
            </mesh>
          )),
        )}
        {/* Canopy */}
        <mesh position={[0, PLATFORM_HEIGHT + 1.3, 0]} castShadow>
          <boxGeometry args={[1.6, 0.1, 5.4]} />
          <meshStandardMaterial color="#5a2f2a" roughness={0.7} />
        </mesh>
        {/* Station building, just behind the platform */}
        <animated.group
          position={[PLATFORM_WIDTH / 2 + BUILDING_WIDTH / 2, 0, 0]}
          scale={scale}
        >
          <mesh position={[0, BUILDING_HEIGHT / 2, 0]} castShadow receiveShadow>
            <boxGeometry
              args={[BUILDING_WIDTH, BUILDING_HEIGHT, BUILDING_LENGTH]}
            />
            <meshStandardMaterial color="#c9b79c" roughness={0.9} />
          </mesh>
          <mesh position={[0, BUILDING_HEIGHT + 0.15, 0]} castShadow>
            <boxGeometry
              args={[BUILDING_WIDTH + 0.2, 0.3, BUILDING_LENGTH + 0.2]}
            />
            <meshStandardMaterial color="#5a2f2a" roughness={0.7} />
          </mesh>
          {/* Door on the platform side */}
          <mesh position={[-BUILDING_WIDTH / 2 - 0.01, 0.4, 0]}>
            <boxGeometry args={[0.02, 0.8, 0.5]} />
            <meshStandardMaterial color="#3b2f28" roughness={0.8} />
          </mesh>
        </animated.group>
        {/* Name board */}
        <mesh position={[0, PLATFORM_HEIGHT + 1, 0]} castShadow>
          <boxGeometry args={[0.04, 0.3, 1.6]} />
          <meshStandardMaterial color="#e8e2d4" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
});

export default Station;
