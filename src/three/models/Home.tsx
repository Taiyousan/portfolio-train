import { forwardRef, useImperativeHandle, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
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
import { StationHints } from "../state/StationHints";
import { useStationClick } from "../hooks/useStationProp";
import {
  HOME_DESK,
  HOME_SCALE,
  POP_SPRING,
  POP_STAGGER_MS,
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
// The fittings start popping once the halt is this close to its stop.
const POP_DISTANCE = 2;
const toDeg = THREE.MathUtils.radToDeg;
const toRad = THREE.MathUtils.degToRad;

// Matches Train's delay, so the driver leaves the cab before appearing here.
const DRIVER_SWAP_DELAY_MS = 250;
const DRIVER_SPRING = { mass: 1, tension: 260, friction: 12, precision: 0.001 };
// The fittings pop one after the other, in this order (the desk last, for
// the driver to sit at), POP_STAGGER_MS apart (see config/scene); in
// reverse order on departure.
const POP_ORDER = [...HOME_FITTINGS, "desk"] as const;
// On departure, the halt itself sinks away this long after its last
// fitting.
const BASE_DEPOP_DELAY_MS = 250 + (POP_ORDER.length - 1) * POP_STAGGER_MS;

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

// Rounded like the rest of the home: a chair with a slatted back, a wooden
// desk on round legs, a laptop, a mug and a little potted plant. Kept clear
// of the snow: in use.
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

// Handlers making the whole stop opaque to the pointer where nothing
// clickable is in front: R3F hands a click to every object along the ray
// that listens, not just the nearest, so a click on the terrace, a railing
// or the desk would otherwise reach the house behind or below it. Clicks
// stop here (a clickable prop in front stops them first). The pointer's
// moves aren't stopped (R3F would then drop a prop's hover without ending
// it), only listened to: that puts the stop's every part on the hover's
// ray, so a prop behind one of them isn't the nearest (see
// useStationClick).
const OPAQUE = {
  onClick: (e: ThreeEvent<MouseEvent>) => e.stopPropagation(),
  onPointerMove: () => {},
};

// The driver at the desk, in a hoodie, typing; clicked, a look at the
// camera. The hoodie picked in the workshop, if that's what was picked.
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
// same side of the track as the station. On the terrace, the driver sits
// at a desk in a hoodie, typing: the conductor is a role, this is the
// developer at work. Its group is moved along z by useStopApproach. Track is
// at y = -0.57 (see TrainScene), so the halt sits on the ground at that
// level.
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

  // The fittings pop in with an elastic overshoot as the train stops, and
  // shrink away as soon as it departs, one after the other (see Station).
  const [popSprings, popApi] = useSprings(POP_ORDER.length, () => ({
    scale: 0,
    config: POP_SPRING,
  }));
  const pops = Object.fromEntries(
    POP_ORDER.map((name, i) => [name, popSprings[i].scale]),
  ) as Record<(typeof POP_ORDER)[number], SpringValue<number>>;
  // The halt, terrace and sign sink away just after them (see Station).
  const [{ base }, baseApi] = useSpring(() => ({
    base: 1,
    config: { ...POP_SPRING, clamp: true },
  }));
  const sunkRef = useRef(false);
  // The driver, stepped off the cab (see Train), pops in at the desk once
  // the cab one has gone.
  const { driverScale } = useSpring({
    driverScale: atHome ? desk.scale : 0,
    delay: atHome ? DRIVER_SWAP_DELAY_MS : 0,
    config: { ...DRIVER_SPRING, clamp: !atHome },
  });
  const groupRef = useRef<THREE.Group>(null);
  useImperativeHandle(ref, () => groupRef.current!, []);
  const shownRef = useRef(false);

  useFrame(() => {
    const z = groupRef.current?.position.z ?? Infinity;
    // z > 0: on the first "arriving" frame this can run before
    // useStopApproach moves the stop out to STOP_DISTANCE, while it's
    // still where it was left (0 at first, STOP_EXIT_Z after a
    // departure): that frame must not count as close.
    // Once shown, kept shown for the rest of the approach (see Station).
    const approaching = shownRef.current || (z > 0 && z < POP_DISTANCE);
    const show = atHome || (here && mode === "arriving" && approaching);
    if (show !== shownRef.current) {
      shownRef.current = show;
      const last = POP_ORDER.length - 1;
      popApi.start((i) => ({
        scale: show ? 1 : 0,
        delay: (show ? i : last - i) * POP_STAGGER_MS,
        // Overshoots on the way in only (see Station).
        config: { ...POP_SPRING, clamp: !show },
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

  const deskPosition: [number, number, number] = [
    desk.x,
    homeDeckHeight(HOME_SCALE),
    desk.z,
  ];
  const deskRotation: [number, number, number] = [0, toRad(desk.yaw), 0];

  return (
    <group ref={groupRef} visible={false}>
      <animated.group position={[HALT_X * STOP_SIDE, -0.57, 0]} scale={base}>
        {/* Its props, and the driver, clickable while stopped here, with no
            hints (see StationHints); clicks on the rest go no further. */}
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
