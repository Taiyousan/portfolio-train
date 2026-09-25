import { forwardRef, useImperativeHandle, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { animated, useSpring } from "@react-spring/three";
import * as THREE from "three";
import { useControls } from "leva";
import { site } from "@/lib/site";
import { useTrainContext } from "../state/TrainContext";
import { HOME_DESK, STOP_SIDE } from "../config/scene";
import Driver, { DRIVER_SEAT_HEIGHT } from "./Driver";

// Same face as the departures board (see StationBoard).
const FONT = "/fonts/geist-mono-600.woff";

// Layout in the halt's ground frame: x across the track (+ away from it),
// z along it, origin at the platform centre, at track level. From the
// track: a small wooden halt, the terrace level with it, then the house.
const HALT_X = 2.85;
const DECK_HEIGHT = 0.3;
const HALT_WIDTH = 0.7;
const HALT_LENGTH = 3;
const TERRACE_START = HALT_WIDTH / 2;
const TERRACE_WIDTH = 1.25;
const TERRACE_LENGTH = 2.6;
const HOUSE_START = TERRACE_START + TERRACE_WIDTH;
const HOUSE_WIDTH = 1.2;
const HOUSE_LENGTH = 2.4;
const WALL_HEIGHT = 1.1;
// Roof: a triangular prism (3-sided cylinder along z), flattened.
const ROOF_RADIUS = (HOUSE_WIDTH + 0.2) / Math.sqrt(3);
const ROOF_FLATTEN = 0.6;
const DOOR_Z = 0.5;
const WINDOW_Z = -0.55;
// Name sign on the halt, seen in the wide arrival shot, out of
// HOME_VIEW_CAMERA's frame (it would hide the desk). The lantern stands at
// the terrace's other corner.
const SIGN_Z = 1.0;
const LANTERN_Z = -1.1;
const SIGN_X = 0.1;
const SIGN_WIDTH = 0.86;
const SIGN_Y = DECK_HEIGHT + 0.62;
// The house starts popping once the halt is this close to its stop.
const POP_DISTANCE = 2;
const toDeg = THREE.MathUtils.radToDeg;
const toRad = THREE.MathUtils.degToRad;

// Matches Train's delay, so the driver leaves the cab before appearing here.
const DRIVER_SWAP_DELAY_MS = 250;
const DRIVER_SPRING = { mass: 1, tension: 260, friction: 12, precision: 0.001 };

const COLORS = {
  halt: "#7b5b3e",
  terrace: "#9c7a52",
  wood: "#3b2f28",
  wall: "#d9c7a5",
  roof: "#4a3b36",
  sign: "#e8e2d4",
  ink: "#2a2a2a",
  // Warm lights inside and on the terrace, caught by the bloom.
  light: "#ffcf87",
  screen: "#8fc2ff",
};

// Desk, chair and laptop in driver units (scaled with the driver by
// HOME_DESK.scale), origin on the floor under the seat, the sitting driver
// facing +z: the desk top sits just under the typing hands.
const DESK_TOP = DRIVER_SEAT_HEIGHT + 0.2;
const DESK_WIDTH = 0.8;
const DESK_DEPTH = 0.42;
const DESK_Z = 0.42;

function DeskSetup() {
  return (
    <group>
      {/* Chair */}
      <mesh castShadow position={[0, DRIVER_SEAT_HEIGHT - 0.02, 0.03]}>
        <boxGeometry args={[0.32, 0.04, 0.4]} />
        <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, DRIVER_SEAT_HEIGHT + 0.15, -0.17]}>
        <boxGeometry args={[0.32, 0.3, 0.03]} />
        <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
      </mesh>
      {[-0.13, 0.13].flatMap((x) =>
        [-0.15, 0.21].map((z) => (
          <mesh
            key={`${x}:${z}`}
            castShadow
            position={[x, (DRIVER_SEAT_HEIGHT - 0.04) / 2, z]}
          >
            <boxGeometry args={[0.03, DRIVER_SEAT_HEIGHT - 0.04, 0.03]} />
            <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
          </mesh>
        )),
      )}

      {/* Desk */}
      <mesh castShadow receiveShadow position={[0, DESK_TOP - 0.015, DESK_Z]}>
        <boxGeometry args={[DESK_WIDTH, 0.03, DESK_DEPTH]} />
        <meshStandardMaterial color={COLORS.terrace} roughness={0.7} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}:${sz}`}
            castShadow
            position={[
              sx * (DESK_WIDTH / 2 - 0.03),
              (DESK_TOP - 0.03) / 2,
              DESK_Z + sz * (DESK_DEPTH / 2 - 0.03),
            ]}
          >
            <boxGeometry args={[0.03, DESK_TOP - 0.03, 0.03]} />
            <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
          </mesh>
        )),
      )}

      {/* Laptop, the hands at its front edge, the lid tipped back and its
          screen lit toward the driver. */}
      <mesh castShadow position={[0, DESK_TOP + 0.0075, 0.4]}>
        <boxGeometry args={[0.3, 0.015, 0.2]} />
        <meshStandardMaterial color="#c9ccd1" metalness={0.4} roughness={0.4} />
      </mesh>
      <group position={[0, DESK_TOP + 0.015, 0.5]} rotation-x={0.25}>
        <mesh castShadow position={[0, 0.1, 0]}>
          <boxGeometry args={[0.3, 0.2, 0.012]} />
          <meshStandardMaterial
            color="#c9ccd1"
            metalness={0.4}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, 0.1, -0.007]}>
          <boxGeometry args={[0.27, 0.17, 0.002]} />
          <meshStandardMaterial
            color={COLORS.screen}
            emissive={COLORS.screen}
            emissiveIntensity={1.2}
          />
        </mesh>
      </group>

      {/* Mug */}
      <mesh castShadow position={[0.28, DESK_TOP + 0.04, 0.34]}>
        <cylinderGeometry args={[0.035, 0.035, 0.08, 12]} />
        <meshStandardMaterial color={COLORS.sign} roughness={0.5} />
      </mesh>
    </group>
  );
}

// The second stop, for "about": a small halt by a house, built from
// primitives like the station and on the same side of the track. On the
// terrace, the driver sits at a desk, cap off, typing: the conductor is a
// role, this is the developer at work. Its group is moved along z by
// useStopApproach. Track is at y = -0.57 (see TrainScene), so the halt sits
// on the ground at that level.
const Home = forwardRef<THREE.Group>(function Home(_, ref) {
  const { mode, stop } = useTrainContext();
  const here = stop === "home";
  const atHome = here && mode === "stopped";
  // Rotation in degrees in the panel, radians in config and the scene.
  const desk = useControls("Maison", {
    x: { value: HOME_DESK.x, min: 0.3, max: 1.6, step: 0.01 },
    z: { value: HOME_DESK.z, min: -1.3, max: 1.3, step: 0.01 },
    yaw: { value: toDeg(HOME_DESK.yaw), min: -180, max: 180, step: 0.5 },
    scale: { value: HOME_DESK.scale, min: 0.2, max: 1.5, step: 0.01 },
  });

  // The house and the furniture pop in with an elastic overshoot as the
  // train stops, and shrink away as soon as it departs (see Station).
  const [{ scale }, api] = useSpring(() => ({
    scale: 0,
    config: { mass: 1, tension: 220, friction: 9, precision: 0.001 },
  }));
  // The driver, stepped off the cab (see Train), pops in at the desk once
  // the cab one has gone.
  const { driverScale } = useSpring({
    driverScale: atHome ? desk.scale : 0,
    delay: atHome ? DRIVER_SWAP_DELAY_MS : 0,
    config: DRIVER_SPRING,
  });
  const groupRef = useRef<THREE.Group>(null);
  useImperativeHandle(ref, () => groupRef.current!, []);
  const shownRef = useRef(false);

  useFrame(() => {
    const z = groupRef.current?.position.z ?? Infinity;
    const show = atHome || (here && mode === "arriving" && z < POP_DISTANCE);
    if (show !== shownRef.current) {
      shownRef.current = show;
      api.start({ scale: show ? 1 : 0 });
    }
  });

  const deskPosition: [number, number, number] = [desk.x, DECK_HEIGHT, desk.z];
  const deskRotation: [number, number, number] = [0, toRad(desk.yaw), 0];

  return (
    <group ref={groupRef} visible={false}>
      <group position={[HALT_X * STOP_SIDE, -0.57, 0]}>
        {/* Halt: a short wooden platform by the track */}
        <mesh position={[0, DECK_HEIGHT / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[HALT_WIDTH, DECK_HEIGHT, HALT_LENGTH]} />
          <meshStandardMaterial color={COLORS.halt} roughness={0.9} />
        </mesh>

        {/* Name sign on two posts, facing the track (-x) */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            castShadow
            position={[
              SIGN_X,
              DECK_HEIGHT + (SIGN_Y - DECK_HEIGHT) / 2,
              SIGN_Z + (side * SIGN_WIDTH) / 2.4,
            ]}
          >
            <boxGeometry args={[0.05, SIGN_Y - DECK_HEIGHT, 0.05]} />
            <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
          </mesh>
        ))}
        <mesh castShadow position={[SIGN_X, SIGN_Y, SIGN_Z]}>
          <boxGeometry args={[0.04, 0.22, SIGN_WIDTH]} />
          <meshStandardMaterial color={COLORS.sign} roughness={0.6} />
        </mesh>
        <Text
          font={FONT}
          position={[SIGN_X - 0.021, SIGN_Y, SIGN_Z]}
          rotation-y={-Math.PI / 2}
          fontSize={0.07}
          maxWidth={SIGN_WIDTH - 0.08}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          color={COLORS.ink}
        >
          {site.name.toUpperCase()}
        </Text>

        {/* Terrace, level with the halt */}
        <mesh
          position={[TERRACE_START + TERRACE_WIDTH / 2, DECK_HEIGHT / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[TERRACE_WIDTH, DECK_HEIGHT, TERRACE_LENGTH]} />
          <meshStandardMaterial color={COLORS.terrace} roughness={0.85} />
        </mesh>
        {/* Railing across the far end */}
        <mesh
          castShadow
          position={[
            TERRACE_START + TERRACE_WIDTH / 2,
            DECK_HEIGHT + 0.3,
            TERRACE_LENGTH / 2 - 0.03,
          ]}
        >
          <boxGeometry args={[TERRACE_WIDTH, 0.03, 0.03]} />
          <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
        </mesh>
        {[0.05, 0.5, 0.95].map((t) => (
          <mesh
            key={t}
            castShadow
            position={[
              TERRACE_START + t * TERRACE_WIDTH,
              DECK_HEIGHT + 0.15,
              TERRACE_LENGTH / 2 - 0.03,
            ]}
          >
            <boxGeometry args={[0.03, 0.3, 0.03]} />
            <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
          </mesh>
        ))}
        {/* Lantern on a post, at the terrace's corner by the halt */}
        <mesh
          castShadow
          position={[TERRACE_START + 0.1, DECK_HEIGHT + 0.3, LANTERN_Z]}
        >
          <boxGeometry args={[0.04, 0.6, 0.04]} />
          <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
        </mesh>
        <mesh position={[TERRACE_START + 0.1, DECK_HEIGHT + 0.65, LANTERN_Z]}>
          <boxGeometry args={[0.08, 0.1, 0.08]} />
          <meshStandardMaterial
            color={COLORS.light}
            emissive={COLORS.light}
            emissiveIntensity={2}
          />
        </mesh>

        {/* Desk on the terrace, then the driver sitting at it. */}
        <animated.group
          position={deskPosition}
          rotation={deskRotation}
          scale={scale.to((s) => s * desk.scale)}
        >
          <DeskSetup />
        </animated.group>
        <animated.group
          position={deskPosition}
          rotation={deskRotation}
          scale={driverScale}
        >
          <Driver
            pose="sitting"
            cap={false}
            typing
            position={[0, DRIVER_SEAT_HEIGHT, 0]}
          />
        </animated.group>

        {/* House, behind the terrace, popping in from the ground */}
        <animated.group
          position={[HOUSE_START + HOUSE_WIDTH / 2, 0, 0]}
          scale={scale}
        >
          <mesh position={[0, WALL_HEIGHT / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[HOUSE_WIDTH, WALL_HEIGHT, HOUSE_LENGTH]} />
            <meshStandardMaterial color={COLORS.wall} roughness={0.9} />
          </mesh>
          <mesh
            position={[0, WALL_HEIGHT + (ROOF_RADIUS * ROOF_FLATTEN) / 2, 0]}
            rotation-x={-Math.PI / 2}
            scale={[1, 1, ROOF_FLATTEN]}
            castShadow
          >
            <cylinderGeometry
              args={[ROOF_RADIUS, ROOF_RADIUS, HOUSE_LENGTH + 0.2, 3]}
            />
            <meshStandardMaterial
              color={COLORS.roof}
              roughness={0.7}
              flatShading
            />
          </mesh>
          {/* Door and lit window on the terrace side */}
          <mesh position={[-HOUSE_WIDTH / 2 - 0.01, DECK_HEIGHT + 0.3, DOOR_Z]}>
            <boxGeometry args={[0.02, 0.6, 0.35]} />
            <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
          </mesh>
          <mesh
            position={[-HOUSE_WIDTH / 2 - 0.005, DECK_HEIGHT + 0.4, WINDOW_Z]}
          >
            <boxGeometry args={[0.02, 0.41, 0.56]} />
            <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
          </mesh>
          <mesh
            position={[-HOUSE_WIDTH / 2 - 0.016, DECK_HEIGHT + 0.4, WINDOW_Z]}
          >
            <boxGeometry args={[0.005, 0.35, 0.5]} />
            <meshStandardMaterial
              color={COLORS.light}
              emissive={COLORS.light}
              emissiveIntensity={1.2}
            />
          </mesh>
        </animated.group>
      </group>
    </group>
  );
});

export default Home;
