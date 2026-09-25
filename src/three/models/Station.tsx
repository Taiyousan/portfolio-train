import { forwardRef, useImperativeHandle, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { animated, useSpring } from "@react-spring/three";
import * as THREE from "three";
import { useControls } from "leva";
import { useTrainContext } from "../state/TrainContext";
import { STATION_BOARD, STATION_DRIVER, STOP_SIDE } from "../config/scene";
import type { StationProject } from "../ui/types";
import StationBoard, { stationBoardHeight } from "./StationBoard";
import Driver, { DRIVER_SEAT_DEPTH } from "./Driver";
import SnowCover from "./SnowCover";

const PLATFORM_LENGTH = 4.4;
const PLATFORM_WIDTH = 1.4;
const PLATFORM_HEIGHT = 0.35;
// The building starts popping once the platform is this close to its stop.
const POP_DISTANCE = 2;
const BUILDING_WIDTH = 1.2;
const BUILDING_LENGTH = 3.4;
const BUILDING_HEIGHT = 1.1;
const POST_XS = [-0.4, 0.4] as const;
const POST_ZS = [-1.9, 1.9] as const;
const CANOPY_WIDTH = 1.6;
const CANOPY_LENGTH = 4.2;
const CANOPY_Y = PLATFORM_HEIGHT + 1.3;
const CANOPY_THICKNESS = 0.1;
const ROOF_THICKNESS = 0.3;
const NAME_BOARD_Z = -1.2;
const toDeg = THREE.MathUtils.radToDeg;
const toRad = THREE.MathUtils.degToRad;

// Matches Train's delay, so the driver leaves the cab before appearing here.
const DRIVER_SWAP_DELAY_MS = 250;
const DRIVER_SPRING = { mass: 1, tension: 260, friction: 12, precision: 0.001 };

// Placeholder station built from primitives, on the +x side of the track so
// the camera (on -x) sees it behind the train. Its group is moved along z by
// useStopApproach. Track is at y = -0.57 (see TrainScene), so the
// platform sits on the ground at that level.
const Station = forwardRef<THREE.Group, { projects: StationProject[] }>(
  function Station({ projects }, ref) {
    const { mode, stop, boardFocused } = useTrainContext();
    const here = stop === "station";
    // Rotations in degrees in the panel, radians in config and the scene.
    const board = useControls("Tableau", {
      x: { value: STATION_BOARD.x, min: -4, max: 2, step: 0.01 },
      lift: { value: STATION_BOARD.lift, min: 0, max: 2, step: 0.01 },
      z: { value: STATION_BOARD.z, min: -3, max: 8, step: 0.01 },
      yaw: { value: toDeg(STATION_BOARD.yaw), min: -180, max: 180, step: 0.5 },
      tilt: { value: toDeg(STATION_BOARD.tilt), min: -45, max: 45, step: 0.5 },
      roll: { value: toDeg(STATION_BOARD.roll), min: -45, max: 45, step: 0.5 },
      scale: { value: STATION_BOARD.scale, min: 0.2, max: 1.5, step: 0.01 },
    });
    const boardHeight = stationBoardHeight(projects.length) * board.scale;
    // The building pops in with an elastic overshoot once the train has
    // stopped, and shrinks away again as soon as it departs. Scaled from its
    // base so it grows out of the ground.
    const [{ scale }, api] = useSpring(() => ({
      scale: 0,
      config: { mass: 1, tension: 220, friction: 9, precision: 0.001 },
    }));
    // The driver, stepped off the cab (see Train), waits on the platform:
    // standing left of the departures board, or sitting on the edge right of
    // it while the board is open (so BOARD_CAMERA frames both). Each pops in
    // once the other (or the cab one) has gone.
    const atStation = here && mode === "stopped";
    const standing = atStation && !boardFocused;
    const sitting = atStation && boardFocused;
    const { standingScale } = useSpring({
      standingScale: standing ? STATION_DRIVER.scale : 0,
      delay: standing ? DRIVER_SWAP_DELAY_MS : 0,
      config: DRIVER_SPRING,
    });
    const { sittingScale } = useSpring({
      sittingScale: sitting ? STATION_DRIVER.scale : 0,
      delay: sitting ? DRIVER_SWAP_DELAY_MS : 0,
      config: DRIVER_SPRING,
    });
    const groupRef = useRef<THREE.Group>(null);
    useImperativeHandle(ref, () => groupRef.current!, []);
    const shownRef = useRef(false);

    // Pops just before the train has fully stopped, so the overshoot lands as
    // it comes to rest.
    useFrame(() => {
      const z = groupRef.current?.position.z ?? Infinity;
      const show =
        atStation || (here && mode === "arriving" && z < POP_DISTANCE);
      if (show !== shownRef.current) {
        shownRef.current = show;
        api.start({ scale: show ? 1 : 0 });
      }
    });

    return (
      <group ref={groupRef} visible={false}>
        <group position={[3.2 * STOP_SIDE, -0.57, 0]}>
          {/* Departures board on the platform, facing the track (-x),
              popping in with the building from its feet. */}
          <animated.group position={[board.x, 0, board.z]} scale={scale}>
            {/* Turned about its feet: yaw from facing the track, then tilt
                (back/forward) and roll in the board's own frame. */}
            <group rotation-y={-Math.PI / 2 + toRad(board.yaw)}>
              <group rotation={[toRad(board.tilt), 0, toRad(board.roll)]}>
                <StationBoard
                  projects={projects}
                  legHeight={board.lift / board.scale}
                  position={[0, board.lift + boardHeight / 2, 0]}
                  scale={board.scale}
                />
              </group>
            </group>
          </animated.group>
          <mesh position={[0, PLATFORM_HEIGHT / 2, 0]} castShadow receiveShadow>
            <boxGeometry
              args={[PLATFORM_WIDTH, PLATFORM_HEIGHT, PLATFORM_LENGTH]}
            />
            <meshStandardMaterial color="#8a7a68" roughness={0.9} />
          </mesh>
          {/* Driver standing left of the board, facing the track (-x). */}
          <animated.group
            position={[
              STATION_DRIVER.standing.x,
              PLATFORM_HEIGHT,
              STATION_DRIVER.standing.z,
            ]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={standingScale}
          >
            <Driver />
          </animated.group>
          {/* Driver sitting on the track-side edge right of the board,
              facing the track (-x), legs over the edge. */}
          <animated.group
            position={[
              -PLATFORM_WIDTH / 2 + DRIVER_SEAT_DEPTH * STATION_DRIVER.scale,
              PLATFORM_HEIGHT,
              STATION_DRIVER.sitting.z,
            ]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={sittingScale}
          >
            <Driver pose="sitting" />
          </animated.group>
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
          <mesh position={[0, CANOPY_Y, 0]} castShadow>
            <boxGeometry
              args={[CANOPY_WIDTH, CANOPY_THICKNESS, CANOPY_LENGTH]}
            />
            <meshStandardMaterial color="#5a2f2a" roughness={0.7} />
          </mesh>
          <SnowCover
            top={[0, CANOPY_Y + CANOPY_THICKNESS / 2, 0]}
            size={[CANOPY_WIDTH, 0.05, CANOPY_LENGTH]}
          />
          {/* Station building, just behind the platform */}
          <animated.group
            position={[PLATFORM_WIDTH / 2 + BUILDING_WIDTH / 2, 0, 0]}
            scale={scale}
          >
            <mesh
              position={[0, BUILDING_HEIGHT / 2, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[BUILDING_WIDTH, BUILDING_HEIGHT, BUILDING_LENGTH]}
              />
              <meshStandardMaterial color="#c9b79c" roughness={0.9} />
            </mesh>
            <mesh
              position={[0, BUILDING_HEIGHT + ROOF_THICKNESS / 2, 0]}
              castShadow
            >
              <boxGeometry
                args={[
                  BUILDING_WIDTH + 0.2,
                  ROOF_THICKNESS,
                  BUILDING_LENGTH + 0.2,
                ]}
              />
              <meshStandardMaterial color="#5a2f2a" roughness={0.7} />
            </mesh>
            <SnowCover
              top={[0, BUILDING_HEIGHT + ROOF_THICKNESS, 0]}
              size={[BUILDING_WIDTH + 0.2, 0.06, BUILDING_LENGTH + 0.2]}
            />
            {/* Door on the platform side */}
            <mesh position={[-BUILDING_WIDTH / 2 - 0.01, 0.4, 0]}>
              <boxGeometry args={[0.02, 0.8, 0.5]} />
              <meshStandardMaterial color="#3b2f28" roughness={0.8} />
            </mesh>
          </animated.group>
          {/* Name board, left of the departures board so they don't
              overlap from the track. */}
          <mesh position={[0, PLATFORM_HEIGHT + 1, NAME_BOARD_Z]} castShadow>
            <boxGeometry args={[0.04, 0.3, 1.6]} />
            <meshStandardMaterial color="#e8e2d4" roughness={0.6} />
          </mesh>
        </group>
      </group>
    );
  },
);

export default Station;
