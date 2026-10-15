import { forwardRef, useImperativeHandle, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { animated, useSpring } from "@react-spring/three";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import { useLivery } from "../state/LiveryContext";
import { StationHints } from "../state/StationHints";
import { useStationClick } from "../hooks/useStationProp";
import useStopPop from "../hooks/useStopPop";
import { useTweaks } from "../debug/tweaks";
import {
  DRIVER_SPRING,
  DRIVER_SWAP_DELAY_MS,
  HOME_DESK,
  HOME_SCALE,
  STOP_SIDE,
} from "../config/scene";
import { OUTFITS } from "../config/livery";
import Driver, {
  DRIVER_SEAT_HEIGHT,
  DRIVER_TYPING_HANDS,
  type DriverHandle,
} from "./Driver";
import HomeDecor, { HOME_FITTINGS, homeDeckHeight } from "./HomeDecor";
import {
  Block,
  Cylinder,
  NoSnow,
  STATION_COLORS as COLORS,
} from "./StationPrimitives";

// The halt's centre, across the track.
const HALT_X = 2.85;
const toDeg = THREE.MathUtils.radToDeg;
const toRad = THREE.MathUtils.degToRad;

// The desk pops in last, for the driver to sit at.
const POP_ORDER = [...HOME_FITTINGS, "desk"] as const;

// Desk, chair and laptop in driver units (scaled with the driver by
// HOME_DESK.scale), origin on the floor under the seat, the sitting driver
// facing +z: the laptop's keyboard sits just under the typing hands, the
// desk's front edge just past the knees.
const DESK_TOP =
  DRIVER_SEAT_HEIGHT +
  DRIVER_TYPING_HANDS.y -
  DRIVER_TYPING_HANDS.radius -
  0.01;
const DESK_WIDTH = 0.8;
const DESK_DEPTH = 0.42;
const DESK_Z = 0.43;
const LAPTOP_Z = DRIVER_TYPING_HANDS.z + 0.05;
const LAPTOP = "#c9ccd1";
const SCREEN = "#8fc2ff";

// A chair with a slatted back, a wooden desk on round legs, a laptop, a mug
// and a little potted plant. Kept clear of the snow: in use.
function DeskSetup() {
  const seat = DRIVER_SEAT_HEIGHT;
  const legHeight = DESK_TOP - 0.03;
  return (
    <NoSnow>
      <group>
        {/* Chair */}
        <Block
          size={[0.34, 0.04, 0.36]}
          position={[0, seat - 0.02, 0.02]}
          radius={0.015}
          color={COLORS.benchWood}
        />
        {[0.1, 0.22].map((y) => (
          <Block
            key={y}
            size={[0.32, 0.07, 0.025]}
            position={[0, seat + y, -0.16]}
            rotation={[-0.1, 0, 0]}
            radius={0.012}
            color={COLORS.benchWood}
          />
        ))}
        {[-0.14, 0.14].map((x) => (
          <Cylinder
            key={x}
            radius={0.014}
            height={0.26}
            position={[x, seat + 0.12, -0.16]}
            color={COLORS.darkWood}
            segments={8}
          />
        ))}
        {[-0.14, 0.14].flatMap((x) =>
          [-0.14, 0.18].map((z) => (
            <Cylinder
              key={`${x}:${z}`}
              radius={0.016}
              height={seat - 0.04}
              position={[x, (seat - 0.04) / 2, z]}
              color={COLORS.darkWood}
              segments={8}
            />
          )),
        )}

        {/* Desk */}
        <Block
          size={[DESK_WIDTH, 0.035, DESK_DEPTH]}
          position={[0, DESK_TOP - 0.0175, DESK_Z]}
          radius={0.014}
          color={COLORS.benchWood}
        />
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <Cylinder
              key={`${sx}:${sz}`}
              radius={0.018}
              top={0.014}
              height={legHeight}
              position={[
                sx * (DESK_WIDTH / 2 - 0.05),
                legHeight / 2,
                DESK_Z + sz * (DESK_DEPTH / 2 - 0.05),
              ]}
              color={COLORS.wood}
              segments={10}
            />
          )),
        )}

        {/* Laptop, the hands at its front edge, the lid tipped back and its
            screen lit toward the driver. */}
        <Block
          size={[0.3, 0.016, 0.2]}
          position={[0, DESK_TOP + 0.008, LAPTOP_Z]}
          radius={0.006}
          color={LAPTOP}
        />
        <group
          position={[0, DESK_TOP + 0.015, LAPTOP_Z + 0.1]}
          rotation-x={0.25}
        >
          <Block
            size={[0.3, 0.2, 0.014]}
            position={[0, 0.1, 0]}
            radius={0.006}
            color={LAPTOP}
          />
          <Block
            size={[0.27, 0.17, 0.004]}
            position={[0, 0.1, -0.007]}
            radius={0.0015}
            color={SCREEN}
            emissive={1.2}
          />
        </group>

        {/* Mug, its handle to the side */}
        <group position={[0.28, DESK_TOP, 0.34]}>
          <Cylinder
            radius={0.035}
            top={0.038}
            height={0.08}
            position={[0, 0.04, 0]}
            color={COLORS.sign}
            segments={14}
          />
          <mesh position={[0.038, 0.042, 0]} castShadow>
            <torusGeometry args={[0.02, 0.007, 6, 12]} />
            <meshStandardMaterial color={COLORS.sign} roughness={0.75} />
          </mesh>
        </group>

        {/* Potted plant on the far corner, past the mug (the laptop stays
            in sight from the track side, on the driver's right) */}
        <group position={[0.3, DESK_TOP, 0.56]}>
          <Cylinder
            radius={0.03}
            top={0.04}
            height={0.055}
            position={[0, 0.0275, 0]}
            color={COLORS.pot}
            segments={14}
          />
          <mesh position={[0, 0.08, 0]} castShadow>
            <sphereGeometry args={[0.047, 12, 10]} />
            <meshStandardMaterial color={COLORS.bush} roughness={0.85} />
          </mesh>
          <mesh position={[0.022, 0.108, 0.015]} castShadow>
            <sphereGeometry args={[0.027, 10, 8]} />
            <meshStandardMaterial color={COLORS.bushLight} roughness={0.85} />
          </mesh>
        </group>
      </group>
    </NoSnow>
  );
}

// Makes the whole stop opaque to the pointer: R3F hands a click to every
// object along the ray, so a click on the terrace or the desk would reach
// the house behind it. Clicks stop here (a clickable prop in front stops
// them first). Moves are only listened to, not stopped: that puts every
// part of the stop on the hover's ray, so a prop behind one of them isn't
// the nearest (see useStationClick).
const OPAQUE = {
  onClick: (e: ThreeEvent<MouseEvent>) => e.stopPropagation(),
  onPointerMove: () => {},
};

// The driver at the desk, in a hoodie (the one picked in the workshop, if
// any), typing; clicked, a look at the camera.
function HomeDriver() {
  const { outfit } = useLivery();
  const driverRef = useRef<DriverHandle>(null);
  const { bind } = useStationClick(() => driverRef.current?.glance(), {
    wiggle: false,
  });
  return (
    <group {...bind}>
      <Driver
        ref={driverRef}
        pose="sitting"
        outfit={outfit.style === "hoodie" ? outfit : OUTFITS.hoodie}
        typing
        position={[0, DRIVER_SEAT_HEIGHT, 0]}
      />
    </group>
  );
}

// The second stop, for "about": a halt by a house (see HomeDecor), on the
// station's side of the track. On the terrace the driver sits at a desk in
// a hoodie, typing: the conductor is a role, this is the developer at
// work. Its group is moved along z by useStopApproach.
const Home = forwardRef<THREE.Group>(function Home(_, ref) {
  const { mode, stop } = useTrainContext();
  const atHome = stop === "home" && mode === "stopped";
  // Rotation in degrees in the panel, radians in config and the scene.
  const desk = useTweaks("Maison", {
    x: { value: HOME_DESK.x, min: 0.3, max: 1.6, step: 0.01 },
    z: { value: HOME_DESK.z, min: -1.3, max: 1.3, step: 0.01 },
    yaw: { value: toDeg(HOME_DESK.yaw), min: -180, max: 180, step: 0.5 },
    scale: { value: HOME_DESK.scale, min: 0.2, max: 1.5, step: 0.01 },
  });
  const groupRef = useRef<THREE.Group>(null);
  useImperativeHandle(ref, () => groupRef.current!, []);
  const { pops, base } = useStopPop("home", POP_ORDER, groupRef);
  // The driver, off the cab (see Train), pops in at the desk once the cab
  // one has gone.
  const { driverScale } = useSpring({
    driverScale: atHome ? desk.scale : 0,
    delay: atHome ? DRIVER_SWAP_DELAY_MS : 0,
    config: { ...DRIVER_SPRING, clamp: !atHome },
  });

  const deskPosition: [number, number, number] = [
    desk.x,
    homeDeckHeight(HOME_SCALE),
    desk.z,
  ];
  const deskRotation: [number, number, number] = [0, toRad(desk.yaw), 0];

  return (
    <group ref={groupRef} visible={false}>
      <animated.group position={[HALT_X * STOP_SIDE, -0.57, 0]} scale={base}>
        {/* Its props and the driver are left to be found: no hints. */}
        <StationHints stop="home" hinted={false}>
          <group {...OPAQUE}>
            <HomeDecor scale={HOME_SCALE} pops={pops} />
            {/* Desk on the terrace, then the driver sitting at it. */}
            <animated.group
              position={deskPosition}
              rotation={deskRotation}
              scale={pops.desk.to((s) => s * desk.scale)}
            >
              <DeskSetup />
            </animated.group>
            <animated.group
              position={deskPosition}
              rotation={deskRotation}
              scale={driverScale}
            >
              <HomeDriver />
            </animated.group>
          </group>
        </StationHints>
      </animated.group>
    </group>
  );
});

export default Home;
