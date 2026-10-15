import { forwardRef, useImperativeHandle, useRef } from "react";
import { animated, useSpring } from "@react-spring/three";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import useClickable from "../hooks/useClickable";
import useStopPop from "../hooks/useStopPop";
import { useTweaks } from "../debug/tweaks";
import { StationHints } from "../state/StationHints";
import { useLivery } from "../state/LiveryContext";
import {
  DRIVER_SPRING,
  DRIVER_SWAP_DELAY_MS,
  STATION_BOARD,
  STATION_DRIVER,
  STATION_PLACEMENT,
  STOP_SIDE,
} from "../config/scene";
import type { StationProject } from "../ui/types";
import StationBoard, {
  STATION_BOARD_SIDE,
  stationBoardHeight,
} from "./StationBoard";
import Driver, { DRIVER_PROPPED_BACK, type DriverHandle } from "./Driver";
import StationDecor, {
  STATION_FITTINGS,
  stationPlatformHeight,
} from "./StationDecor";

const toDeg = THREE.MathUtils.radToDeg;
const toRad = THREE.MathUtils.degToRad;

// The board pops in last, as the thing to click.
const POP_ORDER = [...STATION_FITTINGS, "board"] as const;

// The first stop, for the projects: the station (see StationDecor) and its
// departures board, on the side of the track opposite the camera, on the
// ground at the track's level (y = -0.57). Its group is moved along z by
// useStopApproach.
const Station = forwardRef<THREE.Group, { projects: StationProject[] }>(
  function Station({ projects }, ref) {
    const { mode, stop, boardFocused } = useTrainContext();
    // Off the train, still in the outfit picked in the workshop.
    const { outfit } = useLivery();
    // Rotations in degrees in the panel, radians in config and the scene.
    const board = useTweaks("Tableau", {
      x: { value: STATION_BOARD.x, min: -4, max: 2, step: 0.01 },
      lift: { value: STATION_BOARD.lift, min: 0, max: 2, step: 0.01 },
      z: { value: STATION_BOARD.z, min: -3, max: 8, step: 0.01 },
      yaw: { value: toDeg(STATION_BOARD.yaw), min: -180, max: 180, step: 0.5 },
      tilt: { value: toDeg(STATION_BOARD.tilt), min: -45, max: 45, step: 0.5 },
      roll: { value: toDeg(STATION_BOARD.roll), min: -45, max: 45, step: 0.5 },
      scale: { value: STATION_BOARD.scale, min: 0.2, max: 1.5, step: 0.01 },
    });
    const placement = useTweaks("Gare", {
      scale: {
        value: STATION_PLACEMENT.scale,
        min: 0.05,
        max: 0.4,
        step: 0.005,
      },
      edgeX: { value: STATION_PLACEMENT.edgeX, min: -2, max: 1, step: 0.01 },
      z: { value: STATION_PLACEMENT.z, min: -3, max: 3, step: 0.01 },
    });
    const platformHeight = stationPlatformHeight(placement.scale);
    const boardHeight = stationBoardHeight(projects.length) * board.scale;
    const groupRef = useRef<THREE.Group>(null);
    useImperativeHandle(ref, () => groupRef.current!, []);
    const { pops, base } = useStopPop("station", POP_ORDER, groupRef);

    // The driver, off the cab (see Train), waits on the platform: standing
    // left of the board, or propped against its right side while it's open.
    // Each pops in once the other (or the cab one) has gone.
    const atStation = stop === "station" && mode === "stopped";
    const standing = atStation && !boardFocused;
    const propped = atStation && boardFocused;
    const { standingScale } = useSpring({
      standingScale: standing ? STATION_DRIVER.scale : 0,
      delay: standing ? DRIVER_SWAP_DELAY_MS : 0,
      config: { ...DRIVER_SPRING, clamp: !standing },
    });
    const { proppedScale } = useSpring({
      proppedScale: propped ? STATION_DRIVER.scale : 0,
      delay: propped ? DRIVER_SWAP_DELAY_MS : 0,
      config: { ...DRIVER_SPRING, clamp: !propped },
    });
    // Propped: the back against the board's right edge (on +z, the board
    // facing the track unturned), the feet out from it.
    const proppedYaw = STATION_DRIVER.propped.yaw;
    const proppedOut = DRIVER_PROPPED_BACK.behind * STATION_DRIVER.scale;
    const proppedX =
      board.x -
      STATION_BOARD_SIDE.front * board.scale +
      Math.sin(proppedYaw) * proppedOut;
    const proppedZ =
      board.z +
      STATION_BOARD_SIDE.x * board.scale +
      Math.cos(proppedYaw) * proppedOut;
    // Clicked, the standing driver waves; the propped one looks up.
    const standingDriverRef = useRef<DriverHandle>(null);
    const standingClick = useClickable(standing, () =>
      standingDriverRef.current?.wave(),
    );
    const proppedDriverRef = useRef<DriverHandle>(null);
    const proppedClick = useClickable(propped, () =>
      proppedDriverRef.current?.glance(),
    );

    return (
      <group ref={groupRef} visible={false}>
        <animated.group position={[3.2 * STOP_SIDE, -0.57, 0]} scale={base}>
          <StationHints stop="station">
            {/* The board on the platform, facing the track (-x), turned
                about its feet: yaw, then tilt and roll in its own frame. */}
            <animated.group position={[board.x, 0, board.z]} scale={pops.board}>
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
            <StationDecor placement={placement} pops={pops} />
          </StationHints>
          <animated.group
            position={[
              STATION_DRIVER.standing.x,
              platformHeight,
              STATION_DRIVER.standing.z,
            ]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={standingScale}
          >
            <Driver
              ref={standingDriverRef}
              outfit={outfit}
              {...standingClick}
            />
          </animated.group>
          <animated.group
            position={[proppedX, platformHeight, proppedZ]}
            rotation={[0, proppedYaw, 0]}
            scale={proppedScale}
          >
            <Driver
              ref={proppedDriverRef}
              pose="propped"
              outfit={outfit}
              {...proppedClick}
            />
          </animated.group>
        </animated.group>
      </group>
    );
  },
);

export default Station;
