import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  animated,
  useSpring,
  useSprings,
  type SpringValue,
} from "@react-spring/three";
import * as THREE from "three";
import { useControls } from "leva";
import { useTrainContext } from "../state/TrainContext";
import { useLivery } from "../state/LiveryContext";
import {
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

// The fittings start popping once the platform is this close to its stop.
const POP_DISTANCE = 2;
const toDeg = THREE.MathUtils.radToDeg;
const toRad = THREE.MathUtils.degToRad;

// Matches Train's delay, so the driver leaves the cab before appearing here.
const DRIVER_SWAP_DELAY_MS = 250;
const DRIVER_SPRING = { mass: 1, tension: 260, friction: 12, precision: 0.001 };
const POP_SPRING = { mass: 1, tension: 220, friction: 9, precision: 0.001 };
// The fittings pop one after the other, in this order (the board last, as
// the thing to click), this far apart; in reverse order on departure.
const POP_ORDER = [...STATION_FITTINGS, "board"] as const;
const POP_STAGGER_MS = 70;
// On departure, the station itself sinks away this long after its last
// fitting.
const BASE_DEPOP_DELAY_MS = 250 + (POP_ORDER.length - 1) * POP_STAGGER_MS;

// Station (see StationDecor) on the +x side of the track so the camera
// (on -x) sees it behind the train. Its group is moved along z by
// useStopApproach. Track is at y = -0.57 (see TrainScene), so the
// station sits on the ground at that level.
const Station = forwardRef<THREE.Group, { projects: StationProject[] }>(
  function Station({ projects }, ref) {
    const { mode, stop, boardFocused } = useTrainContext();
    // Off the train, still in the outfit picked in the workshop.
    const { outfit } = useLivery();
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
    const placement = useControls("Gare", {
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
    // The fittings pop in with an elastic overshoot once the train has
    // stopped, and shrink away again as soon as it departs. Each is scaled
    // from its feet so it grows out of the floor or wall.
    const [popSprings, popApi] = useSprings(POP_ORDER.length, () => ({
      scale: 0,
      config: POP_SPRING,
    }));
    const pops = Object.fromEntries(
      POP_ORDER.map((name, i) => [name, popSprings[i].scale]),
    ) as Record<(typeof POP_ORDER)[number], SpringValue<number>>;
    // The rest of the station is already there as it slides in, but shrinks
    // into the ground on departure, just after the fittings. Clamped so it
    // doesn't overshoot into a negative (mirrored) scale.
    const [{ base }, baseApi] = useSpring(() => ({
      base: 1,
      config: { ...POP_SPRING, clamp: true },
    }));
    const sunkRef = useRef(false);
    // The driver, stepped off the cab (see Train), waits on the platform:
    // standing left of the departures board, or propped against its right
    // side while it's open (so BOARD_CAMERA frames both). Each pops in once
    // the other (or the cab one) has gone.
    const atStation = here && mode === "stopped";
    const standing = atStation && !boardFocused;
    const propped = atStation && boardFocused;
    const { standingScale } = useSpring({
      standingScale: standing ? STATION_DRIVER.scale : 0,
      delay: standing ? DRIVER_SWAP_DELAY_MS : 0,
      config: DRIVER_SPRING,
    });
    const { proppedScale } = useSpring({
      proppedScale: propped ? STATION_DRIVER.scale : 0,
      delay: propped ? DRIVER_SWAP_DELAY_MS : 0,
      config: DRIVER_SPRING,
    });
    // Propped: the back against the board's right-hand side edge (on +z,
    // the board facing the track unturned), the feet out from it.
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
    // Clicking the standing driver makes it wave.
    const standingDriverRef = useRef<DriverHandle>(null);
    const pointingDriverRef = useRef(false);
    useEffect(() => {
      if (!standing && pointingDriverRef.current) {
        pointingDriverRef.current = false;
        document.body.style.cursor = "";
      }
    }, [standing]);
    const groupRef = useRef<THREE.Group>(null);
    useImperativeHandle(ref, () => groupRef.current!, []);
    const shownRef = useRef(false);

    // Pops just before the train has fully stopped, so the overshoot lands as
    // it comes to rest.
    useFrame(() => {
      const z = groupRef.current?.position.z ?? Infinity;
      // z > 0: on the first "arriving" frame this can run before
      // useStopApproach moves the stop out to STOP_DISTANCE, while it's
      // still where it was left (0 at first, STOP_EXIT_Z after a
      // departure): that frame must not count as close.
      const approaching = z > 0 && z < POP_DISTANCE;
      const show = atStation || (here && mode === "arriving" && approaching);
      if (show !== shownRef.current) {
        shownRef.current = show;
        const last = POP_ORDER.length - 1;
        popApi.start((i) => ({
          scale: show ? 1 : 0,
          delay: (show ? i : last - i) * POP_STAGGER_MS,
        }));
        if (!show) {
          sunkRef.current = true;
          baseApi.start({ base: 0, delay: BASE_DEPOP_DELAY_MS });
        }
      }
      // Back to full size, out of sight, before sliding in again.
      if (sunkRef.current && here && mode === "arriving") {
        sunkRef.current = false;
        baseApi.stop();
        baseApi.set({ base: 1 });
      }
    });

    return (
      <group ref={groupRef} visible={false}>
        <animated.group position={[3.2 * STOP_SIDE, -0.57, 0]} scale={base}>
          {/* Departures board on the platform, facing the track (-x),
              popping in with the fittings from its feet. */}
          <animated.group position={[board.x, 0, board.z]} scale={pops.board}>
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
          <StationDecor placement={placement} pops={pops} />
          {/* Driver standing left of the board, facing the track (-x),
              waving when clicked. */}
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
              onClick={(e) => {
                if (!standing) return;
                e.stopPropagation();
                standingDriverRef.current?.wave();
              }}
              onPointerOver={(e) => {
                if (!standing) return;
                e.stopPropagation();
                pointingDriverRef.current = true;
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                if (!pointingDriverRef.current) return;
                pointingDriverRef.current = false;
                document.body.style.cursor = "";
              }}
            />
          </animated.group>
          {/* Driver propped against the board's right-hand side, passing
              the time. */}
          <animated.group
            position={[proppedX, platformHeight, proppedZ]}
            rotation={[0, proppedYaw, 0]}
            scale={proppedScale}
          >
            <Driver pose="propped" outfit={outfit} />
          </animated.group>
        </animated.group>
      </group>
    );
  },
);

export default Station;
