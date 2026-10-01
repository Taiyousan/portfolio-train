import { useState } from "react";
import { Text } from "@react-three/drei";
import type { SpringValue } from "@react-spring/three";
import { useStationClick } from "../hooks/useStationProp";
import { snowy } from "../shaders/snow";
import { StationHints } from "../state/StationHints";
import HintOrb from "./HintOrb";
import {
  Block,
  Cylinder,
  NoSnow,
  Pop,
  STATION_COLORS as COLORS,
  Window,
  WindowBox,
  glass,
  useHouseGeometry,
  type Vec3,
} from "./StationPrimitives";
import {
  Bench,
  Clock,
  Lamp,
  Luggage,
  Planter,
  TrashCan,
} from "./StationProps";

// The station's platform, building and props, built from rounded
// primitives, cartoon style: soft edges everywhere (RoundedBox, bevelled
// extrusions) and warm lights. In its own units: x from the platform's
// track-side edge (+ away from the track), y up (platform top at 1.6), z
// along the track (the platform from -11.7 to 11.7); scaled into the
// station's ground frame by StationPlacement.

const FONT = "/fonts/geist-mono-600.woff";

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
      {/* Paving on top, a shade lighter, inset from the edges, and a
          yellow safety line along the track side: swept clear of the snow,
          left on the platform's edges all round. */}
      <NoSnow>
        <Block
          size={[PLATFORM_DEPTH - 0.5, 0.1, PLATFORM_LENGTH - 0.5]}
          position={[PLATFORM_DEPTH / 2, PLATFORM_TOP, 0]}
          radius={0.04}
          color={COLORS.platform}
        />
        <Block
          size={[0.45, 0.06, PLATFORM_LENGTH - 1.2]}
          position={[0.9, PLATFORM_TOP + 0.06, 0]}
          radius={0.02}
          color={COLORS.edge}
        />
      </NoSnow>
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

function Building() {
  const house = useHouseGeometry({
    ...BUILDING,
    bevel: HOUSE_BEVEL,
  });
  const half = BUILDING.depth / 2;
  const cx = BUILDING.x + half;
  const base = PLATFORM_TOP;
  const slopeLength = (half + EAVE) / Math.cos(BUILDING.pitch);
  const roofRise = (half + EAVE) * Math.tan(BUILDING.pitch);
  const canopyDepth = BUILDING.x - CANOPY.front;
  const canopyTilt = 0.08;
  // Its windows go dark on a click, and light up again on the next one, or
  // when the train leaves.
  const [lit, setLit] = useState(true);
  const { bind, hint, atStop } = useStationClick(
    () => setLit((on) => !on),
    { wiggle: false },
  );
  if (!atStop && !lit) setLit(true);
  const { color: glassColor, emissive: glassGlow } = glass(lit);

  return (
    <group {...bind}>
      {/* Plinth, walls and gables */}
      <Block
        size={[BUILDING.depth + 0.3, 0.6, BUILDING.length + 0.3]}
        position={[cx, base + 0.3, 0]}
        radius={0.2}
        color={COLORS.plinth}
      />
      <mesh geometry={house} position={[cx, base, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...snowy} color={COLORS.wall} roughness={0.85} />
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
          {...snowy}
          color={COLORS.edge}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>
      {[-3.2, 3.2].map((z) => (
        <group key={z}>
          <Window position={[FRONT - 0.05, base + 2.4, z]} lit={lit} />
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
            color={glassColor}
            emissive={glassColor}
            emissiveIntensity={glassGlow}
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
      {/* Over the roof's ridge. */}
      <HintOrb
        hint={hint}
        position={[cx, base + BUILDING.wall + roofRise + 0.8, 0]}
      />
    </group>
  );
}

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
      <StationHints stop="station">
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
      </StationHints>
    </group>
  );
}
