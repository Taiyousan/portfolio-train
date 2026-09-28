import { useMemo, type ReactNode } from "react";
import { RoundedBox, Text } from "@react-three/drei";
import { animated, type SpringValue } from "@react-spring/three";
import * as THREE from "three";
import SnowCover from "./SnowCover";

// The station's platform, building and props, built from rounded
// primitives, cartoon style: soft edges everywhere (RoundedBox, bevelled
// extrusions) and warm lights. In its own units: x from the platform's
// track-side edge (+ away from the track), y up (platform top at 1.6), z
// along the track (the platform from -11.7 to 11.7); scaled into the
// station's ground frame by StationPlacement.

type Vec3 = [number, number, number];

const PLATFORM_TOP = 1.6;
const PLATFORM_DEPTH = 17.5;
const PLATFORM_LENGTH = 23.4;

// Where the station sits in its ground frame (origin at the platform centre,
// at track level; x across the track, + away from it; z along it).
export type StationPlacement = {
  // World units per station unit.
  scale: number;
  // x of the platform's track-side edge.
  edgeX: number;
  // Shift along the track.
  z: number;
};

// Height of the platform top above the track, in the station's frame.
export function stationPlatformHeight(scale: number) {
  return PLATFORM_TOP * scale;
}

// Shared with the departures board (StationBoard), so it looks part of the
// station.
export const STATION_COLORS = {
  platform: "#b3a288",
  platformSide: "#8f7d66",
  edge: "#e2b54c",
  wall: "#efdfbf",
  plinth: "#a8876a",
  roof: "#a4493a",
  wood: "#7b5b3e",
  darkWood: "#4a3526",
  iron: "#34353b",
  benchWood: "#c08552",
  bin: "#4f7d4c",
  pot: "#b8643f",
  bush: "#5d8f4a",
  bushLight: "#78a857",
  suitcase: "#b5533c",
  trunk: "#5f86a0",
  strap: "#5a3a26",
  sign: "#f1e8d4",
  ink: "#3b2a20",
  light: "#ffcf87",
};
const COLORS = STATION_COLORS;
const FLOWER_COLORS = ["#f08a5d", "#f5d36b", "#e2769a", "#fff3e0"];
const FONT = "/fonts/geist-mono-600.woff";

// Lamps: post height (the lantern sits on top), and their warm light's
// intensity and reach (world units).
const LAMP_HEIGHT = 4.6;
const LAMP_INTENSITY = 4;
const LAMP_DISTANCE = 2.5;

// Parts popping in at a stop, each with its own spring (see Station, which
// staggers them in this order).
export const STATION_FITTINGS = [
  "building",
  "planters",
  "lamps",
  "bench",
  "luggage",
  "trashCan",
] as const;
type Fitting = (typeof STATION_FITTINGS)[number];

function Block({
  size,
  position,
  rotation,
  radius = 0.2,
  color,
  emissive,
}: {
  size: Vec3;
  position?: Vec3;
  rotation?: Vec3;
  radius?: number;
  color: string;
  emissive?: number;
}) {
  return (
    <RoundedBox
      args={size}
      radius={Math.min(radius, ...size.map((d) => d / 2 - 0.001))}
      smoothness={3}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={0.75}
        emissive={emissive ? color : "#000000"}
        emissiveIntensity={emissive ?? 0}
      />
    </RoundedBox>
  );
}

function Cylinder({
  radius,
  height,
  position,
  rotation,
  color,
  top = radius,
  segments = 16,
}: {
  radius: number;
  height: number;
  position?: Vec3;
  rotation?: Vec3;
  color: string;
  top?: number;
  segments?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[top, radius, height, segments]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

// A group popping in with `pop`, scaled from `feet`.
function Pop({
  feet,
  pop,
  children,
}: {
  feet: Vec3;
  pop: SpringValue<number>;
  children: ReactNode;
}) {
  return (
    <animated.group position={feet} scale={pop}>
      <group position={[-feet[0], -feet[1], -feet[2]]}>{children}</group>
    </animated.group>
  );
}

// ---------------------------------------------------------------- platform

// Stairs down from the platform's -z end, away from the track, with a
// handrail on each side.
const STAIRS = { x: 13, width: 5, rise: 0.4, run: 0.9 };

function Stairs() {
  const steps = Math.round(PLATFORM_TOP / STAIRS.rise) - 1;
  const end = -PLATFORM_LENGTH / 2;
  const length = (steps + 1) * STAIRS.run;
  const railHeight = 1.1;
  const slope = Math.atan2(PLATFORM_TOP, length);
  const railLength = Math.hypot(PLATFORM_TOP, length);
  return (
    <group>
      {Array.from({ length: steps }, (_, i) => {
        const height = PLATFORM_TOP - STAIRS.rise * (i + 1);
        return (
          <Block
            key={i}
            size={[STAIRS.width, height, STAIRS.run + 0.3]}
            position={[
              STAIRS.x,
              height / 2,
              end - STAIRS.run * (i + 0.5) + 0.15,
            ]}
            radius={0.12}
            color={COLORS.platformSide}
          />
        );
      })}
      {[-1, 1].map((side) => {
        const x = STAIRS.x + side * (STAIRS.width / 2 - 0.25);
        return (
          <group key={side}>
            <Cylinder
              radius={0.1}
              height={railHeight}
              position={[x, PLATFORM_TOP + railHeight / 2, end + 0.3]}
              color={COLORS.iron}
            />
            <Cylinder
              radius={0.1}
              height={railHeight}
              position={[x, railHeight / 2, end - length + 0.3]}
              color={COLORS.iron}
            />
            <group
              position={[
                x,
                PLATFORM_TOP / 2 + railHeight,
                end - length / 2 + 0.3,
              ]}
              rotation-x={-slope}
            >
              <Cylinder
                radius={0.09}
                height={railLength + 0.2}
                rotation={[Math.PI / 2, 0, 0]}
                color={COLORS.iron}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
}

function Platform() {
  return (
    <group>
      <Block
        size={[PLATFORM_DEPTH, PLATFORM_TOP, PLATFORM_LENGTH]}
        position={[PLATFORM_DEPTH / 2, PLATFORM_TOP / 2, 0]}
        radius={0.35}
        color={COLORS.platformSide}
      />
      {/* Paving on top, a shade lighter, inset from the edges. */}
      <Block
        size={[PLATFORM_DEPTH - 0.5, 0.1, PLATFORM_LENGTH - 0.5]}
        position={[PLATFORM_DEPTH / 2, PLATFORM_TOP, 0]}
        radius={0.04}
        color={COLORS.platform}
      />
      {/* Yellow safety line along the track side */}
      <Block
        size={[0.45, 0.06, PLATFORM_LENGTH - 1.2]}
        position={[0.9, PLATFORM_TOP + 0.06, 0]}
        radius={0.02}
        color={COLORS.edge}
      />
      <Stairs />
    </group>
  );
}

// ---------------------------------------------------------------- building

const BUILDING = { x: 10.5, depth: 6, length: 11, wall: 5, pitch: Math.PI / 6 };
const EAVE = 0.9;
// The house's rounded bevel grows it outward by this much all round, so its
// front face, where the door and windows go, is this far toward the track.
const HOUSE_BEVEL = 0.25;
const FRONT = BUILDING.x - HOUSE_BEVEL;
const CANOPY = { front: 5, y: PLATFORM_TOP + 4.7, thickness: 0.3 };

// House-shaped section (walls and gables in one), extruded along z with a
// rounded bevel.
function useHouseGeometry() {
  return useMemo(() => {
    const half = BUILDING.depth / 2;
    const ridge = BUILDING.wall + half * Math.tan(BUILDING.pitch);
    const shape = new THREE.Shape()
      .moveTo(-half, 0)
      .lineTo(half, 0)
      .lineTo(half, BUILDING.wall)
      .lineTo(0, ridge)
      .lineTo(-half, BUILDING.wall)
      .closePath();
    const bevel = HOUSE_BEVEL;
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: BUILDING.length - 2 * bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
    });
    geometry.translate(0, 0, -(BUILDING.length - 2 * bevel) / 2);
    return geometry;
  }, []);
}

// A lit window in the front wall, facing the track (-x).
function Window({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Block size={[0.3, 2.2, 1.9]} radius={0.12} color={COLORS.wood} />
      <Block
        size={[0.2, 1.8, 1.5]}
        position={[-0.08, 0, 0]}
        radius={0.08}
        color={COLORS.light}
        emissive={1.1}
      />
      {/* Mullions */}
      <Block
        size={[0.12, 1.8, 0.1]}
        position={[-0.2, 0, 0]}
        radius={0.04}
        color={COLORS.wood}
      />
      <Block
        size={[0.12, 0.1, 1.5]}
        position={[-0.2, 0.2, 0]}
        radius={0.04}
        color={COLORS.wood}
      />
      {/* Sill */}
      <Block
        size={[0.6, 0.15, 2.2]}
        position={[-0.2, -1.15, 0]}
        radius={0.06}
        color={COLORS.sign}
      />
    </group>
  );
}

// A row of little flowers along a window box, their colours and heights
// varied by `seed`.
function Flowers({
  count,
  spread,
  y,
  seed,
}: {
  count: number;
  spread: number;
  y: number;
  seed: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const t = count === 1 ? 0 : i / (count - 1) - 0.5;
        const color = FLOWER_COLORS[(i + seed) % FLOWER_COLORS.length];
        return (
          <mesh
            key={i}
            position={[
              ((i + seed) % 3) * 0.08 - 0.08,
              y + ((i * 7 + seed) % 3) * 0.06,
              t * spread,
            ]}
            castShadow
          >
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        );
      })}
    </>
  );
}

function WindowBox({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Block size={[0.7, 0.45, 1.9]} radius={0.12} color={COLORS.wood} />
      <mesh position={[0, 0.3, 0]} scale={[0.5, 0.35, 1.6]} castShadow>
        <sphereGeometry args={[0.6, 14, 10]} />
        <meshStandardMaterial color={COLORS.bush} roughness={0.8} />
      </mesh>
      <Flowers count={5} spread={1.5} y={0.45} seed={position[2] > 0 ? 1 : 0} />
    </group>
  );
}

function Clock({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      {/* Bracket down from the canopy */}
      <Cylinder
        radius={0.06}
        height={0.5}
        position={[0, 0.95, 0]}
        color={COLORS.iron}
      />
      <group rotation-z={Math.PI / 2}>
        <Cylinder radius={0.7} height={0.3} color={COLORS.iron} segments={24} />
        <Cylinder
          radius={0.58}
          height={0.32}
          color={COLORS.sign}
          segments={24}
        />
      </group>
      {/* Hands on the track side (-x), each turning about the dial's
          centre (a turn about x reads clockwise from the track): ten past
          ten. A short tail past the pivot, and a cap over it. */}
      {CLOCK_HANDS.map(({ angle, length, width, x }) => (
        <group key={x} position={[x, 0, 0]} rotation-x={angle}>
          <Block
            size={[0.04, length, width]}
            position={[0, length / 2 - 0.08, 0]}
            radius={0.02}
            color={COLORS.ink}
          />
        </group>
      ))}
      <mesh position={[-0.25, 0, 0]}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshStandardMaterial color={COLORS.ink} />
      </mesh>
    </group>
  );
}

const CLOCK_HANDS = [
  // Hour: just past 10.
  { angle: -THREE.MathUtils.degToRad(55), length: 0.38, width: 0.08, x: -0.19 },
  // Minute: on 2.
  { angle: THREE.MathUtils.degToRad(60), length: 0.52, width: 0.06, x: -0.22 },
];

function Building() {
  const house = useHouseGeometry();
  const half = BUILDING.depth / 2;
  const cx = BUILDING.x + half;
  const base = PLATFORM_TOP;
  const slopeLength = (half + EAVE) / Math.cos(BUILDING.pitch);
  const roofRise = (half + EAVE) * Math.tan(BUILDING.pitch);
  const canopyDepth = BUILDING.x - CANOPY.front;
  const canopyTilt = 0.08;

  return (
    <group>
      {/* Plinth, walls and gables */}
      <Block
        size={[BUILDING.depth + 0.3, 0.6, BUILDING.length + 0.3]}
        position={[cx, base + 0.3, 0]}
        radius={0.2}
        color={COLORS.plinth}
      />
      <mesh geometry={house} position={[cx, base, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={COLORS.wall} roughness={0.85} />
      </mesh>
      {/* Roof: two slabs meeting at the ridge, eaves overhanging. */}
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[
            cx + (side * (half + EAVE)) / 2,
            base +
              BUILDING.wall -
              EAVE * Math.tan(BUILDING.pitch) +
              roofRise / 2 +
              0.2,
            0,
          ]}
          rotation-z={-side * BUILDING.pitch}
        >
          <Block
            size={[slopeLength + 0.3, 0.35, BUILDING.length + 1.4]}
            radius={0.15}
            color={COLORS.roof}
          />
          <SnowCover
            top={[0, 0.175, 0]}
            size={[slopeLength + 0.3, 0.3, BUILDING.length + 1.4]}
          />
        </group>
      ))}
      {/* Chimney */}
      <Block
        size={[0.9, 2, 0.9]}
        position={[cx + 1.4, base + BUILDING.wall + 1.6, 3]}
        radius={0.15}
        color={COLORS.plinth}
      />

      {/* Front, facing the track: door between two windows. */}
      <Block
        size={[0.3, 3.3, 2.2]}
        position={[FRONT - 0.05, base + 1.65, 0]}
        radius={0.12}
        color={COLORS.wood}
      />
      <Block
        size={[0.25, 3, 1.8]}
        position={[FRONT - 0.15, base + 1.5, 0]}
        radius={0.1}
        color={COLORS.darkWood}
      />
      <mesh position={[FRONT - 0.35, base + 1.5, 0.6]} castShadow>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial
          color={COLORS.edge}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>
      {[-3.2, 3.2].map((z) => (
        <group key={z}>
          <Window position={[FRONT - 0.05, base + 2.4, z]} />
          <WindowBox position={[FRONT - 0.45, base + 0.95, z]} />
        </group>
      ))}
      {/* Round window in the -z gable, facing the camera side. */}
      <group
        position={[cx, base + BUILDING.wall - 0.6, -BUILDING.length / 2 - 0.05]}
        rotation-x={Math.PI / 2}
      >
        <Cylinder radius={0.8} height={0.3} color={COLORS.wood} segments={24} />
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.2, 24]} />
          <meshStandardMaterial
            color={COLORS.light}
            emissive={COLORS.light}
            emissiveIntensity={1.1}
          />
        </mesh>
      </group>

      {/* Canopy over the platform, on two posts, tipped toward the track. */}
      <group
        position={[CANOPY.front + canopyDepth / 2, CANOPY.y, 0]}
        rotation-z={canopyTilt}
      >
        <Block
          size={[canopyDepth + 0.6, CANOPY.thickness, BUILDING.length - 0.6]}
          radius={0.12}
          color={COLORS.roof}
        />
        <SnowCover
          top={[0, CANOPY.thickness / 2, 0]}
          size={[canopyDepth + 0.6, 0.25, BUILDING.length - 0.6]}
        />
      </group>
      {[-4.4, 4.4].map((z) => (
        <group key={z}>
          <Cylinder
            radius={0.16}
            height={CANOPY.y - base - 0.2}
            position={[
              CANOPY.front + 0.4,
              base + (CANOPY.y - base - 0.2) / 2,
              z,
            ]}
            color={COLORS.darkWood}
          />
          <Cylinder
            radius={0.28}
            top={0.2}
            height={0.25}
            position={[CANOPY.front + 0.4, base + 0.12, z]}
            color={COLORS.darkWood}
          />
        </group>
      ))}
      {/* Name board on the canopy's edge */}
      <group position={[CANOPY.front - 0.2, CANOPY.y + 0.2, 0]}>
        <Block size={[0.2, 1, 4.2]} radius={0.1} color={COLORS.sign} />
        <Text
          font={FONT}
          fontSize={0.62}
          letterSpacing={0.18}
          color={COLORS.ink}
          anchorX="center"
          anchorY="middle"
          position={[-0.11, -0.02, 0]}
          rotation-y={-Math.PI / 2}
        >
          GARE
        </Text>
      </group>
      <Clock position={[CANOPY.front + 1.2, CANOPY.y - 1.25, -2.6]} />
    </group>
  );
}

// ---------------------------------------------------------------- props

function Bench({ position }: { position: Vec3 }) {
  const length = 3.4;
  return (
    <group position={position}>
      {[-0.25, 0.25].map((x) => (
        <Block
          key={x}
          size={[0.42, 0.14, length]}
          position={[x, 1, 0]}
          radius={0.06}
          color={COLORS.benchWood}
        />
      ))}
      {[1.4, 1.85].map((y) => (
        <Block
          key={y}
          size={[0.13, 0.36, length]}
          position={[0.55, y, 0]}
          rotation={[0, 0, 0.12]}
          radius={0.06}
          color={COLORS.benchWood}
        />
      ))}
      {[-1.4, 1.4].map((z) => (
        <group key={z}>
          <Block
            size={[1, 0.12, 0.14]}
            position={[0.05, 0.9, z]}
            radius={0.05}
            color={COLORS.iron}
          />
          <Block
            size={[0.12, 0.95, 0.14]}
            position={[-0.35, 0.45, z]}
            radius={0.05}
            color={COLORS.iron}
          />
          <Block
            size={[0.12, 2.05, 0.14]}
            position={[0.45, 1.0, z]}
            rotation={[0, 0, 0.12]}
            radius={0.05}
            color={COLORS.iron}
          />
        </group>
      ))}
    </group>
  );
}

function Luggage({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Block
        size={[0.95, 0.75, 1.3]}
        position={[0, 0.375, 0]}
        radius={0.15}
        color={COLORS.trunk}
      />
      <Block
        size={[0.97, 0.77, 0.14]}
        position={[0, 0.375, -0.35]}
        radius={0.05}
        color={COLORS.strap}
      />
      <Block
        size={[0.97, 0.77, 0.14]}
        position={[0, 0.375, 0.35]}
        radius={0.05}
        color={COLORS.strap}
      />
      <group position={[0.05, 0.75, 0.05]} rotation-y={0.3}>
        <Block
          size={[0.5, 1.05, 1.1]}
          position={[0, 0.525, 0]}
          radius={0.14}
          color={COLORS.suitcase}
        />
        <mesh position={[0, 1.12, 0]} rotation-y={Math.PI / 2} castShadow>
          <torusGeometry args={[0.2, 0.05, 8, 16, Math.PI]} />
          <meshStandardMaterial color={COLORS.strap} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

function TrashCan({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Cylinder
        radius={0.42}
        top={0.48}
        height={1.2}
        position={[0, 0.6, 0]}
        color={COLORS.bin}
      />
      <mesh position={[0, 1.2, 0]} rotation-x={Math.PI / 2} castShadow>
        <torusGeometry args={[0.48, 0.07, 8, 20]} />
        <meshStandardMaterial color={COLORS.iron} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.22, 0]} scale={[1, 0.45, 1]} castShadow>
        <sphereGeometry args={[0.46, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={COLORS.bin} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Lamp({ position, pop }: { position: Vec3; pop: SpringValue<number> }) {
  return (
    <group position={position}>
      <Cylinder
        radius={0.3}
        top={0.22}
        height={0.3}
        position={[0, 0.15, 0]}
        color={COLORS.iron}
      />
      <Cylinder
        radius={0.09}
        height={LAMP_HEIGHT}
        position={[0, LAMP_HEIGHT / 2, 0]}
        color={COLORS.iron}
      />
      <group position={[0, LAMP_HEIGHT + 0.4, 0]}>
        <Block
          size={[0.5, 0.65, 0.5]}
          radius={0.12}
          color={COLORS.light}
          emissive={2}
        />
        <Cylinder
          radius={0.5}
          top={0.12}
          height={0.35}
          position={[0, 0.48, 0]}
          color={COLORS.iron}
          segments={4}
          rotation={[0, Math.PI / 4, 0]}
        />
        <mesh position={[0, 0.72, 0]}>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial color={COLORS.iron} />
        </mesh>
        <Block
          size={[0.62, 0.08, 0.62]}
          position={[0, -0.36, 0]}
          radius={0.03}
          color={COLORS.iron}
        />
        {/* Lit as the lamp pops in. */}
        <animated.pointLight
          color={COLORS.light}
          intensity={pop.to((v) => Math.max(v, 0) * LAMP_INTENSITY)}
          distance={LAMP_DISTANCE}
        />
      </group>
    </group>
  );
}

function Planter({ position, size = 1 }: { position: Vec3; size?: number }) {
  return (
    <group position={position} scale={size}>
      <Cylinder
        radius={0.6}
        top={0.8}
        height={1}
        position={[0, 0.5, 0]}
        color={COLORS.pot}
        segments={20}
      />
      <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.95, 16, 12]} />
        <meshStandardMaterial color={COLORS.bush} roughness={0.85} />
      </mesh>
      <mesh position={[0.35, 1.75, 0.3]} castShadow>
        <sphereGeometry args={[0.55, 14, 10]} />
        <meshStandardMaterial color={COLORS.bushLight} roughness={0.85} />
      </mesh>
      {/* A ring of small flowers dotted over the top of the bush. */}
      {PLANTER_FLOWERS.map((angle, i) => (
        <mesh
          key={angle}
          position={[
            Math.cos(angle) * 0.7,
            1.95 - (i % 2) * 0.25,
            Math.sin(angle) * 0.7,
          ]}
          castShadow
        >
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshStandardMaterial color={FLOWER_COLORS[i % 3]} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// Angles (radians) of the flowers around a planter's bush, unevenly spaced.
const PLANTER_FLOWERS = [0.3, 1.4, 2.3, 3.3, 4.2, 5.3];

// ---------------------------------------------------------------- station

// Where the props stand on the platform. Each pops from its own feet, with
// its group's spring.
const PLANTERS: { at: Vec3; size: number }[] = [
  { at: [9.2, PLATFORM_TOP, -9.4], size: 1 },
  { at: [9.2, PLATFORM_TOP, 8.2], size: 0.85 },
  { at: [15.8, PLATFORM_TOP, 7.3], size: 0.7 },
];
const LAMPS: Vec3[] = [
  [1.6, PLATFORM_TOP, -9.6],
  [1.6, PLATFORM_TOP, 10.9],
];
const BENCH: Vec3 = [8.4, PLATFORM_TOP, -3.3];
const LUGGAGE: Vec3 = [7.6, PLATFORM_TOP, -6];
const TRASH_CAN: Vec3 = [7.2, PLATFORM_TOP, 3.3];

// The platform (already there as the station slides in), with the building
// and props each popping in by their spring in `pops`.
export default function StationDecor({
  placement,
  pops,
}: {
  placement: StationPlacement;
  pops: Record<Fitting, SpringValue<number>>;
}) {
  return (
    <group position={[placement.edgeX, 0, placement.z]} scale={placement.scale}>
      <Platform />
      <Pop
        feet={[BUILDING.x + BUILDING.depth / 2, PLATFORM_TOP, 0]}
        pop={pops.building}
      >
        <Building />
      </Pop>
      {PLANTERS.map(({ at, size }) => (
        <Pop key={at.join()} feet={at} pop={pops.planters}>
          <Planter position={at} size={size} />
        </Pop>
      ))}
      {LAMPS.map((at) => (
        <Pop key={at.join()} feet={at} pop={pops.lamps}>
          <Lamp position={at} pop={pops.lamps} />
        </Pop>
      ))}
      <Pop feet={BENCH} pop={pops.bench}>
        <Bench position={BENCH} />
      </Pop>
      <Pop feet={LUGGAGE} pop={pops.luggage}>
        <Luggage position={LUGGAGE} />
      </Pop>
      <Pop feet={TRASH_CAN} pop={pops.trashCan}>
        <TrashCan position={TRASH_CAN} />
      </Pop>
    </group>
  );
}
