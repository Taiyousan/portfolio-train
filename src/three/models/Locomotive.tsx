import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import { useLivery } from "../state/LiveryContext";
import { shade } from "../config/livery";
import { snowy } from "../shaders/snow";
import {
  Block,
  Cylinder,
  NoSnow,
  STATION_COLORS,
  type Vec3,
} from "./StationPrimitives";

// A rounded cartoon steam locomotive, built like the station and the home
// (see StationPrimitives): a boiler with bands and a dome, a dark smokebox
// with a flared chimney and a headlamp up front, and an open cab at the
// back, under a roof, for the driver (see Train). Painted in the livery
// picked in the workshop (see config/livery), red, navy and brass at
// first. Its
// wheels roll on the rails with the train's speed, the coupling and
// connecting rods following them, while the body sways on top of them. In
// world units, facing +z, centred on the origin, 2 long.

// The livery's colours (Livery's body, roof and trim, and a darker shade
// of the body for the cab floor and the wheels' spokes and counterweights).
type Paint = { body: string; bodyDark: string; roof: string; trim: string };

// Everything else, whatever the livery.
const COLORS = {
  iron: STATION_COLORS.iron,
  steel: "#8d939c",
  smokebox: "#2c2e35",
  door: "#3a3c44",
  glass: "#9cc7e0",
  dial: STATION_COLORS.sign,
  light: STATION_COLORS.light,
};

const HALF_PI = Math.PI / 2;
// Along z (a cylinder's axis is y).
const ALONG_Z: Vec3 = [HALF_PI, 0, 0];
// Along x.
const ALONG_X: Vec3 = [0, 0, HALF_PI];
const SIDES = [-1, 1] as const;

// The body's sway, same motion as drei's <Float speed={50}
// rotationIntensity={0.1} floatIntensity={0.0035}>, but its phase advances
// with the train's speed and its amplitude fades to zero at a standstill,
// so the train comes to rest upright instead of freezing mid-tilt.
const SWAY_RATE = 12.5;
const SWAY_ROTATION = 0.1;
const SWAY_LIFT = 0.0035;

// Top of rails.glb's rail heads (Rails is at y = -0.57, see TrainScene),
// where the wheels touch them, and their centre either side of the centre
// line, the wheels' mid-plane.
export const RAIL_TOP = -0.546;
const GAUGE_X = 0.2755;
const WHEEL_WIDTH = 0.05;
// Also paces the chimney's puffs (see Smoke).
export const DRIVING_RADIUS = 0.19;
const DRIVING_Y = RAIL_TOP + DRIVING_RADIUS;
const DRIVING_FRONT_Z = 0.12;
const DRIVING_BACK_Z = -0.34;
// Front to back: a small leading pair, the two big driving pairs (joined
// by the coupling rods, the front one driven by the pistons) and a small
// trailing pair under the cab.
const WHEELS = [
  { z: 0.7, radius: 0.11, driving: false },
  { z: DRIVING_FRONT_Z, radius: DRIVING_RADIUS, driving: true },
  { z: DRIVING_BACK_Z, radius: DRIVING_RADIUS, driving: true },
  { z: -0.72, radius: 0.11, driving: false },
];
// Crank pin's distance from the axle, and the connecting rod's length,
// crank pin to crosshead.
const CRANK = 0.07;
const MAIN_ROD = 0.21;
// Rods outside the wheels: the coupling rod, then the connecting rod.
const COUPLING_X = GAUGE_X + WHEEL_WIDTH / 2 + 0.02;
const MAIN_ROD_X = COUPLING_X + 0.025;
// Steam cylinders, level with the driving axles, between the crosshead's
// furthest reach (plus its half length) and the leading wheels, end caps
// included.
const PISTON_LENGTH = 0.12;
const PISTON_BACK = DRIVING_FRONT_Z + CRANK + MAIN_ROD + 0.04;
const PISTON = {
  back: PISTON_BACK,
  front: PISTON_BACK + PISTON_LENGTH,
  radius: 0.055,
  x: MAIN_ROD_X + 0.005,
};

// The deck everything stands on, just clear of the rods at the top of
// their stroke (half their height, plus a margin, above the crank pins).
const DECK_THICKNESS = 0.06;
const DECK = {
  y: DRIVING_Y + CRANK + 0.03 + DECK_THICKNESS / 2,
  thickness: DECK_THICKNESS,
  back: -0.95,
  front: 0.86,
  width: 0.78,
};
const DECK_TOP = DECK.y + DECK.thickness / 2;

const BOILER = { radius: 0.25, back: -0.3, front: 0.4 };
const BOILER_Y = DECK_TOP + BOILER.radius;
const SMOKEBOX = { radius: 0.27, back: 0.36, front: 0.68 };
// On the smokebox.
const CHIMNEY_Z = 0.5;
const CHIMNEY_BASE = BOILER_Y + SMOKEBOX.radius - 0.03;
// Centre of the chimney's mouth, where Smoke's puffs start from.
export const CHIMNEY_TOP: Vec3 = [0, CHIMNEY_BASE + 0.216, CHIMNEY_Z];

// The cab: the driver stands on its floor; open above the sill, between
// the front wall and the posts at the back.
const CAB = {
  back: -0.92,
  front: -0.3,
  floor: DECK_TOP + 0.03,
  sill: DECK_TOP + 0.3,
  roof: DECK_TOP + 0.66,
  width: 0.76,
};
const CAB_LENGTH = CAB.front - CAB.back;
// Where the driver stands (see Train).
export const CAB_FLOOR = CAB.floor;
// The sill's brass cap on the +x side, which the driver leans on in the
// workshop (see Train): its inner edge and its top.
export const CAB_SILL = { x: CAB.width / 2 - 0.07, top: CAB.sill + 0.015 };
const CAB_Z = (CAB.front + CAB.back) / 2;

// A wheel, its axle along x, centred on its hub; `side` is the way its
// outer face looks. Driving wheels carry a crank pin at CRANK above the
// hub and a counterweight opposite.
function Wheel({
  radius,
  side,
  driving,
  paint,
}: {
  radius: number;
  side: number;
  driving: boolean;
  paint: Paint;
}) {
  const face = side * (WHEEL_WIDTH / 2 + 0.006);
  return (
    <>
      <mesh rotation={ALONG_X} castShadow>
        <cylinderGeometry args={[radius, radius, WHEEL_WIDTH, 28]} />
        <meshStandardMaterial color={COLORS.iron} roughness={0.75} />
      </mesh>
      <Cylinder
        radius={radius - 0.025}
        height={WHEEL_WIDTH + 0.01}
        rotation={ALONG_X}
        color={paint.body}
        segments={24}
      />
      {/* Spokes, so the wheel is seen to turn */}
      {[0, 1, 2].map((i) => (
        <Block
          key={i}
          size={[0.012, 2 * (radius - 0.04), 0.024]}
          position={[face, 0, 0]}
          rotation={[(i * Math.PI) / 3, 0, 0]}
          radius={0.005}
          color={paint.bodyDark}
        />
      ))}
      <Cylinder
        radius={0.035}
        height={WHEEL_WIDTH + 0.03}
        rotation={ALONG_X}
        color={paint.trim}
        segments={12}
      />
      {driving && (
        <>
          <Block
            size={[0.016, 0.07, 0.16]}
            position={[face, -(radius - 0.065), 0]}
            radius={0.02}
            color={paint.bodyDark}
          />
          <Cylinder
            radius={0.018}
            height={0.06}
            position={[side * (WHEEL_WIDTH / 2 + 0.03), CRANK, 0]}
            rotation={ALONG_X}
            color={paint.trim}
            segments={10}
          />
        </>
      )}
    </>
  );
}

// The half-round cover over a driving wheel, rising through the deck.
function Splasher({
  side,
  z,
  paint,
}: {
  side: number;
  z: number;
  paint: Paint;
}) {
  const radius = DRIVING_RADIUS + 0.025;
  return (
    <group position={[side * GAUGE_X, DRIVING_Y, z]}>
      <mesh rotation={ALONG_X} castShadow receiveShadow>
        <cylinderGeometry
          args={[radius, radius, 0.07, 24, 1, false, 0, Math.PI]}
        />
        <meshStandardMaterial {...snowy} color={paint.body} roughness={0.75} />
      </mesh>
      <mesh
        position={[side * 0.035, 0, 0]}
        rotation={[0, HALF_PI, 0]}
        castShadow
      >
        <torusGeometry args={[radius, 0.012, 6, 24, Math.PI]} />
        <meshStandardMaterial {...snowy} color={paint.trim} roughness={0.6} />
      </mesh>
    </group>
  );
}

// A buffer beam across the deck's end, `dir` its way out, with its two
// buffers. A little wider and longer than the deck, so their faces don't
// meet in the same planes (z-fighting).
function BufferBeam({ dir, paint }: { dir: number; paint: Paint }) {
  const end = dir > 0 ? DECK.front : DECK.back;
  return (
    <group position={[0, DECK.y - 0.04, end + dir * (0.01 - 0.035)]}>
      <Block
        size={[DECK.width + 0.02, 0.16, 0.07]}
        radius={0.025}
        color={paint.body}
      />
      {SIDES.map((side) => (
        <group key={side} position={[side * 0.27, 0, 0]}>
          <Cylinder
            radius={0.025}
            height={0.08}
            position={[0, 0, dir * 0.075]}
            rotation={ALONG_Z}
            color={COLORS.steel}
            segments={10}
          />
          <Cylinder
            radius={0.055}
            height={0.03}
            position={[0, 0, dir * 0.12]}
            rotation={ALONG_Z}
            color={COLORS.iron}
            segments={16}
          />
        </group>
      ))}
    </group>
  );
}

// `children` ride in the body (the driver, see Train).
export default function Locomotive({ children }: { children?: ReactNode }) {
  const { trainSpeedRef, targetTrainSpeed } = useTrainContext();
  const { livery } = useLivery();
  const paint = useMemo<Paint>(
    () => ({ ...livery, bodyDark: shade(livery.body, 0.75) }),
    [livery],
  );
  const bodyRef = useRef<THREE.Group>(null);
  const swayPhaseRef = useRef(0);
  // Distance rolled so far: every wheel's angle follows from it and its
  // radius, and the rods from the driving wheels' angle.
  const distanceRef = useRef(0);
  // One entry per side (SIDES' order) for the rods, per side and wheel
  // (WHEELS' order) for the wheels, filled by callback refs.
  const wheelRefs = useRef<(THREE.Group | null)[]>([]);
  const couplingRefs = useRef<(THREE.Group | null)[]>([]);
  const mainRodRefs = useRef<(THREE.Group | null)[]>([]);
  const crossheadRefs = useRef<(THREE.Group | null)[]>([]);
  const pistonRodRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (body) {
      const cruise = Math.max(targetTrainSpeed, 1);
      const speedRatio = trainSpeedRef.current / cruise;
      swayPhaseRef.current += delta * SWAY_RATE * speedRatio;
      const amplitude = THREE.MathUtils.smoothstep(speedRatio, 0, 1);
      const phase = swayPhaseRef.current;
      body.rotation.set(
        (Math.cos(phase) / 8) * SWAY_ROTATION * amplitude,
        (Math.sin(phase) / 8) * SWAY_ROTATION * amplitude,
        (Math.sin(phase) / 20) * SWAY_ROTATION * amplitude,
      );
      body.position.y = (Math.sin(phase) / 10) * SWAY_LIFT * amplitude;
    }

    distanceRef.current += delta * trainSpeedRef.current;
    const distance = distanceRef.current;
    // Rolling without slipping: angle = distance / radius. A positive
    // turn about x brings the top forward (+z).
    wheelRefs.current.forEach((wheel, i) => {
      if (wheel) wheel.rotation.x = distance / WHEELS[i % WHEELS.length].radius;
    });

    // The crank pin, at (0, CRANK, 0) in the turning wheel.
    const angle = distance / DRIVING_RADIUS;
    const pinY = DRIVING_Y + CRANK * Math.cos(angle);
    const pinZ = CRANK * Math.sin(angle);
    // The connecting rod runs from the front pin to the crosshead, which
    // slides level with the axles.
    const frontPinZ = DRIVING_FRONT_Z + pinZ;
    const rise = DRIVING_Y - pinY;
    const reach = Math.sqrt(MAIN_ROD * MAIN_ROD - rise * rise);
    const crossheadZ = frontPinZ + reach;

    for (let s = 0; s < SIDES.length; s++) {
      const coupling = couplingRefs.current[s];
      if (coupling) {
        coupling.position.y = pinY;
        coupling.position.z = (DRIVING_FRONT_Z + DRIVING_BACK_Z) / 2 + pinZ;
      }
      const mainRod = mainRodRefs.current[s];
      if (mainRod) {
        mainRod.position.y = (pinY + DRIVING_Y) / 2;
        mainRod.position.z = frontPinZ + reach / 2;
        mainRod.rotation.x = Math.atan2(-rise, reach);
      }
      const crosshead = crossheadRefs.current[s];
      if (crosshead) crosshead.position.z = crossheadZ;
      // The piston rod, from the crosshead into the cylinder.
      const pistonRod = pistonRodRefs.current[s];
      if (pistonRod) {
        const length = PISTON.back - crossheadZ + 0.03;
        pistonRod.position.z = crossheadZ + length / 2;
        pistonRod.scale.z = length;
      }
    }
  });

  const deckLength = DECK.front - DECK.back;
  const boilerLength = BOILER.front - BOILER.back;
  const smokeboxLength = SMOKEBOX.front - SMOKEBOX.back;
  // Handrails along the boiler's flanks, this high above its axis.
  const railRise = 0.12;
  const railX = Math.sqrt(BOILER.radius ** 2 - railRise ** 2) + 0.025;
  const sillHeight = CAB.sill - DECK_TOP;
  const postHeight = CAB.roof - CAB.sill;

  return (
    <group>
      {/* Running gear, on the rails: wheels and motion on each side */}
      <NoSnow>
        {SIDES.map((side, s) => (
          <group key={side}>
            {WHEELS.map((wheel, i) => (
              <group
                key={wheel.z}
                ref={(group) => {
                  wheelRefs.current[s * WHEELS.length + i] = group;
                }}
                position={[side * GAUGE_X, RAIL_TOP + wheel.radius, wheel.z]}
              >
                <Wheel
                  radius={wheel.radius}
                  side={side}
                  driving={wheel.driving}
                  paint={paint}
                />
              </group>
            ))}

            <group
              ref={(group) => {
                couplingRefs.current[s] = group;
              }}
              position={[side * COUPLING_X, DRIVING_Y + CRANK, 0]}
            >
              <Block
                size={[0.02, 0.035, DRIVING_FRONT_Z - DRIVING_BACK_Z + 0.06]}
                radius={0.01}
                color={COLORS.steel}
              />
            </group>
            <group
              ref={(group) => {
                mainRodRefs.current[s] = group;
              }}
              position={[side * MAIN_ROD_X, DRIVING_Y, 0]}
            >
              <Block
                size={[0.02, 0.035, MAIN_ROD + 0.04]}
                radius={0.01}
                color={COLORS.steel}
              />
            </group>
            <group
              ref={(group) => {
                crossheadRefs.current[s] = group;
              }}
              position={[side * MAIN_ROD_X, DRIVING_Y, 0]}
            >
              <Block
                size={[0.035, 0.05, 0.05]}
                radius={0.012}
                color={paint.trim}
              />
            </group>
            <group
              ref={(group) => {
                pistonRodRefs.current[s] = group;
              }}
              position={[side * MAIN_ROD_X, DRIVING_Y, 0]}
            >
              {/* One unit long, stretched to fit by its group's scale. */}
              <mesh rotation={ALONG_Z}>
                <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
                <meshStandardMaterial color={COLORS.steel} roughness={0.5} />
              </mesh>
            </group>
          </group>
        ))}
      </NoSnow>

      {/* The body, swaying on its springs */}
      <group ref={bodyRef}>
        {/* Frame, deck and buffer beams */}
        <Block
          size={[0.46, 0.16, 1.7]}
          position={[0, DECK.y - 0.11, -0.05]}
          radius={0.03}
          color={COLORS.iron}
        />
        <Block
          size={[DECK.width, DECK.thickness, deckLength]}
          position={[0, DECK.y, (DECK.front + DECK.back) / 2]}
          radius={0.025}
          color={COLORS.iron}
        />
        <BufferBeam dir={1} paint={paint} />
        <BufferBeam dir={-1} paint={paint} />

        {/* Cowcatcher: bars leaning forward under the front beam */}
        {[-0.24, -0.12, 0, 0.12, 0.24].map((x) => (
          <Block
            key={x}
            size={[0.045, 0.2, 0.035]}
            position={[x, RAIL_TOP + 0.135, DECK.front + 0.02]}
            rotation={[-0.5, 0, 0]}
            radius={0.015}
            color={COLORS.iron}
          />
        ))}
        <Block
          size={[0.6, 0.035, 0.045]}
          position={[0, RAIL_TOP + 0.05, DECK.front + 0.065]}
          radius={0.015}
          color={COLORS.iron}
        />

        {/* Splashers over the driving wheels, steam cylinders */}
        {SIDES.map((side) => (
          <group key={side}>
            {[DRIVING_FRONT_Z, DRIVING_BACK_Z].map((z) => (
              <Splasher key={z} side={side} z={z} paint={paint} />
            ))}
            {/* Steam cylinder, with brass end caps */}
            <group
              position={[
                side * PISTON.x,
                DRIVING_Y,
                (PISTON.back + PISTON.front) / 2,
              ]}
            >
              <Cylinder
                radius={PISTON.radius}
                height={PISTON.front - PISTON.back}
                rotation={ALONG_Z}
                color={paint.body}
                segments={18}
              />
              {[-1, 1].map((end) => (
                <Cylinder
                  key={end}
                  radius={PISTON.radius + 0.008}
                  height={0.018}
                  position={[0, 0, (end * (PISTON.front - PISTON.back)) / 2]}
                  rotation={ALONG_Z}
                  color={paint.trim}
                  segments={18}
                />
              ))}
            </group>
          </group>
        ))}

        {/* Warm: no snow on the boiler and smokebox */}
        <NoSnow>
          {/* Boiler: bands, dome, whistle and handrails */}
          <Cylinder
            radius={BOILER.radius}
            height={boilerLength}
            position={[0, BOILER_Y, (BOILER.front + BOILER.back) / 2]}
            rotation={ALONG_Z}
            color={paint.body}
            segments={28}
          />
          {[-0.15, 0.1, 0.3].map((z) => (
            <mesh key={z} position={[0, BOILER_Y, z]} castShadow>
              <torusGeometry args={[BOILER.radius + 0.004, 0.014, 8, 32]} />
              <meshStandardMaterial color={paint.trim} roughness={0.6} />
            </mesh>
          ))}
          <group position={[0, BOILER_Y + BOILER.radius, -0.03]}>
            <Cylinder
              radius={0.085}
              top={0.072}
              height={0.1}
              position={[0, 0.01, 0]}
              color={paint.trim}
              segments={18}
            />
            <mesh position={[0, 0.06, 0]} scale={[1, 0.75, 1]} castShadow>
              <sphereGeometry args={[0.072, 18, 10]} />
              <meshStandardMaterial color={paint.trim} roughness={0.6} />
            </mesh>
          </group>
          <group position={[0.1, BOILER_Y + BOILER.radius - 0.02, -0.22]}>
            <Cylinder
              radius={0.016}
              height={0.08}
              position={[0, 0.04, 0]}
              color={paint.trim}
              segments={8}
            />
            <Cylinder
              radius={0.026}
              top={0.02}
              height={0.05}
              position={[0, 0.1, 0]}
              color={paint.trim}
              segments={12}
            />
          </group>
          {SIDES.map((side) => (
            <Cylinder
              key={side}
              radius={0.01}
              height={boilerLength + 0.2}
              position={[
                side * railX,
                BOILER_Y + railRise,
                (BOILER.front + BOILER.back) / 2 + 0.05,
              ]}
              rotation={ALONG_Z}
              color={paint.trim}
              segments={6}
            />
          ))}

          {/* Smokebox: rounded door with a brass ring, chimney, headlamp */}
          <Cylinder
            radius={SMOKEBOX.radius}
            height={smokeboxLength}
            position={[0, BOILER_Y, (SMOKEBOX.front + SMOKEBOX.back) / 2]}
            rotation={ALONG_Z}
            color={COLORS.smokebox}
            segments={28}
          />
          <group position={[0, BOILER_Y, SMOKEBOX.front]}>
            <mesh scale={[1, 1, 0.3]} castShadow>
              <sphereGeometry args={[SMOKEBOX.radius - 0.02, 24, 14]} />
              <meshStandardMaterial color={COLORS.door} roughness={0.7} />
            </mesh>
            <mesh castShadow>
              <torusGeometry args={[SMOKEBOX.radius - 0.02, 0.016, 8, 32]} />
              <meshStandardMaterial color={paint.trim} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.075]} castShadow>
              <sphereGeometry args={[0.025, 10, 8]} />
              <meshStandardMaterial color={paint.trim} roughness={0.6} />
            </mesh>
          </group>
          <group position={[0, CHIMNEY_BASE, CHIMNEY_Z]}>
            <Cylinder
              radius={0.1}
              top={0.08}
              height={0.06}
              position={[0, 0.01, 0]}
              color={COLORS.smokebox}
              segments={18}
            />
            {/* Flared, a little wider at the top */}
            <Cylinder
              radius={0.075}
              top={0.1}
              height={0.17}
              position={[0, 0.085, 0]}
              color={COLORS.smokebox}
              segments={18}
            />
            <Cylinder
              radius={0.108}
              height={0.025}
              position={[0, 0.155, 0]}
              color={paint.trim}
              segments={18}
            />
            <Cylinder
              radius={0.118}
              height={0.045}
              position={[0, 0.19, 0]}
              color={COLORS.smokebox}
              segments={18}
            />
            <Cylinder
              radius={0.085}
              height={0.01}
              position={[0, 0.211, 0]}
              color="#141417"
              segments={18}
            />
          </group>
          <group
            position={[
              0,
              BOILER_Y + SMOKEBOX.radius + 0.05,
              SMOKEBOX.front - 0.02,
            ]}
          >
            <Cylinder
              radius={0.065}
              height={0.1}
              rotation={ALONG_Z}
              color={paint.body}
              segments={18}
            />
            <mesh position={[0, 0, 0.052]} rotation={ALONG_Z}>
              <cylinderGeometry args={[0.052, 0.052, 0.01, 18]} />
              <meshStandardMaterial
                color={COLORS.light}
                emissive={COLORS.light}
                emissiveIntensity={1.6}
              />
            </mesh>
            <mesh position={[0, 0, 0.05]}>
              <torusGeometry args={[0.058, 0.012, 6, 20]} />
              <meshStandardMaterial color={paint.trim} roughness={0.6} />
            </mesh>
          </group>
        </NoSnow>

        {/* Cab */}
        <Block
          size={[CAB.width - 0.08, CAB.floor - DECK_TOP, CAB_LENGTH - 0.08]}
          position={[0, (CAB.floor + DECK_TOP) / 2, CAB_Z]}
          radius={0.01}
          color={paint.bodyDark}
        />
        {/* Front wall, round windows either side of the boiler */}
        <Block
          size={[CAB.width + 0.02, CAB.roof - DECK_TOP, 0.06]}
          position={[0, (CAB.roof + DECK_TOP) / 2, CAB.front]}
          radius={0.025}
          color={paint.body}
        />
        {SIDES.map((side) => (
          <group
            key={side}
            position={[side * 0.22, CAB.roof - 0.14, CAB.front]}
          >
            <Cylinder
              radius={0.06}
              height={0.07}
              rotation={ALONG_Z}
              color={COLORS.glass}
              segments={20}
            />
            {[-1, 1].map((face) => (
              <mesh key={face} position={[0, 0, face * 0.034]}>
                <torusGeometry args={[0.065, 0.014, 6, 20]} />
                <meshStandardMaterial
                  {...snowy}
                  color={paint.trim}
                  roughness={0.6}
                />
              </mesh>
            ))}
          </group>
        ))}
        {/* Firebox backhead facing the driver, with two gauges */}
        <Block
          size={[0.34, 0.3, 0.05]}
          position={[0, CAB.floor + 0.21, CAB.front - 0.05]}
          radius={0.02}
          color={COLORS.smokebox}
        />
        <Block
          size={[0.12, 0.08, 0.02]}
          position={[0, CAB.floor + 0.16, CAB.front - 0.08]}
          radius={0.01}
          color={paint.trim}
        />
        {[-0.07, 0.07].map((x) => (
          <mesh
            key={x}
            position={[x, CAB.floor + 0.31, CAB.front - 0.08]}
            rotation={ALONG_Z}
          >
            <cylinderGeometry args={[0.032, 0.032, 0.02, 14]} />
            <meshStandardMaterial color={COLORS.dial} roughness={0.6} />
          </mesh>
        ))}
        {/* Sides and back, up to the sill, capped in brass */}
        {SIDES.map((side) => (
          <group key={side}>
            <Block
              size={[0.06, sillHeight, CAB_LENGTH]}
              position={[
                side * (CAB.width / 2 - 0.03),
                DECK_TOP + sillHeight / 2,
                CAB_Z,
              ]}
              radius={0.025}
              color={paint.body}
            />
            <Block
              size={[0.08, 0.03, CAB_LENGTH + 0.02]}
              position={[side * (CAB.width / 2 - 0.03), CAB.sill, CAB_Z]}
              radius={0.012}
              color={paint.trim}
            />
            {/* Brass number plate */}
            <Block
              size={[0.014, 0.1, 0.2]}
              position={[
                side * (CAB.width / 2 + 0.002),
                CAB.sill - 0.14,
                CAB_Z,
              ]}
              radius={0.006}
              color={paint.trim}
            />
            {/* Back post */}
            <Cylinder
              radius={0.03}
              height={postHeight}
              position={[
                side * (CAB.width / 2 - 0.035),
                CAB.sill + postHeight / 2,
                CAB.back + 0.035,
              ]}
              color={paint.body}
              segments={12}
            />
          </group>
        ))}
        <Block
          size={[CAB.width - 0.01, sillHeight, 0.06]}
          position={[0, DECK_TOP + sillHeight / 2, CAB.back + 0.035]}
          radius={0.025}
          color={paint.body}
        />
        <Block
          size={[CAB.width - 0.14, 0.03, 0.08]}
          position={[0, CAB.sill, CAB.back + 0.03]}
          radius={0.012}
          color={paint.trim}
        />
        {/* Roof overhanging all round, crowned, snowed on in winter */}
        <Block
          size={[CAB.width + 0.12, 0.06, CAB_LENGTH + 0.16]}
          position={[0, CAB.roof + 0.03, CAB_Z]}
          radius={0.028}
          color={paint.roof}
        />
        <Block
          size={[CAB.width - 0.2, 0.04, CAB_LENGTH + 0.12]}
          position={[0, CAB.roof + 0.07, CAB_Z]}
          radius={0.018}
          color={paint.roof}
        />
        {children}
      </group>
    </group>
  );
}
