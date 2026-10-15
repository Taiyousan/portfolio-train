import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { animated, useSprings, type SpringValue } from "@react-spring/three";
import type * as THREE from "three";
import { site } from "@/lib/site";
import { SCENE_FONT } from "../config/scene";
import { useStationClick } from "../hooks/useStationProp";
import { snowy } from "../shaders/snow";
import {
  Block,
  Cylinder,
  NoSnow,
  RoundedBox,
  Pop,
  STATION_COLORS,
  Window,
  glass,
  useHouseGeometry,
  type Vec3,
} from "./StationPrimitives";
import { Lamp, Mailbox, PingPong, Planter } from "./StationProps";
import useReducedMotion from "../hooks/useReducedMotion";

// The home stop, built like the station from the same primitives and
// props: from the track, a wooden halt with a name sign and a mailbox, a
// terrace between two railings (the desk goes there, see Home), then a
// wooden cabin. In the station's units: x from the halt's centre (+ away
// from the track), y up from the track, z along it; scaled by HOME_SCALE.

const COLORS = {
  ...STATION_COLORS,
  cladding: "#d8ab74",
  board: "#bb8b57",
  slate: "#5a6579",
  ridge: "#474f5e",
  stone: "#a39686",
  stoneDark: "#857868",
  door: "#2f6f73",
  doorPanel: "#3b8286",
  deckFrame: "#6e5037",
  terrace: ["#b98b5a", "#ad7f4f"],
  halt: ["#9c7550", "#8f6a47"],
};

// Deck tops (halt and terrace), and the planks' thickness on their frames.
const DECK_TOP = 1.75;
const PLANK = 0.22;

// Height of the decks above the track, in the halt's ground frame.
export function homeDeckHeight(scale: number) {
  return DECK_TOP * scale;
}

const HALT = { x: -2.1, width: 4.2, length: 17.6 };
const HOUSE = {
  x: 9.6,
  depth: 5,
  length: 13,
  wall: 4.6,
  pitch: Math.PI / 6,
};
// The house's rounded bevel grows it outward by this much all round, so its
// front face, where the door and windows go, is this far toward the track.
const HOUSE_BEVEL = 0.25;
const FRONT = HOUSE.x - HOUSE_BEVEL;
// The stone plinth under the house, up to the floor (level with the
// terrace), sticks out past the walls by this much.
const PLINTH_OUT = 0.35;
const EAVE = 0.8;
const TERRACE = {
  x: HALT.x + HALT.width,
  width: HOUSE.x - PLINTH_OUT - (HALT.x + HALT.width),
  length: 15.2,
};
const RAILING_HEIGHT = 1.8;

// On the front: the window behind the desk, the door, the lantern.
const WINDOW_Z = -3.3;
const DOOR_Z = 2.2;
const LANTERN_Z = 4.2;

// Parts popping in at the stop, in this order (see useStopPop).
export const HOME_FITTINGS = [
  "house",
  "lamp",
  "planters",
  "paddle",
  "mailbox",
] as const;
type Fitting = (typeof HOME_FITTINGS)[number];

// ---------------------------------------------------------------- decks

// A wooden deck from `x` to `x + width`, centred on z: its frame, then
// planks laid along `along` in alternating shades, swept clear of the
// snow.
function Deck({
  x,
  width,
  length,
  along,
  shades,
}: {
  x: number;
  width: number;
  length: number;
  along: "x" | "z";
  shades: string[];
}) {
  const across = along === "z" ? width : length;
  const count = Math.max(1, Math.round(across / 1.05));
  const pitch = across / count;
  const frame = DECK_TOP - PLANK;
  return (
    <group>
      <Block
        size={[width, frame, length]}
        position={[x + width / 2, frame / 2, 0]}
        radius={0.2}
        color={COLORS.deckFrame}
      />
      <NoSnow>
        {Array.from({ length: count }, (_, i) => {
          const offset = -across / 2 + pitch * (i + 0.5);
          return (
            <Block
              key={i}
              size={
                along === "z"
                  ? [pitch - 0.08, PLANK, length - 0.2]
                  : [width - 0.2, PLANK, pitch - 0.08]
              }
              position={[
                x + width / 2 + (along === "z" ? offset : 0),
                DECK_TOP - PLANK / 2,
                along === "x" ? offset : 0,
              ]}
              radius={0.08}
              color={shades[i % shades.length]}
            />
          );
        })}
      </NoSnow>
    </group>
  );
}

// Posts, a top rail and a middle rail across the terrace at `z`.
function Railing({ z, from, to }: { z: number; from: number; to: number }) {
  const posts = Math.max(2, Math.round((to - from) / 1.6) + 1);
  const length = to - from;
  return (
    <group>
      {Array.from({ length: posts }, (_, i) => (
        <Cylinder
          key={i}
          radius={0.12}
          height={RAILING_HEIGHT}
          position={[
            from + (length * i) / (posts - 1),
            DECK_TOP + RAILING_HEIGHT / 2,
            z,
          ]}
          color={COLORS.darkWood}
        />
      ))}
      <Block
        size={[length + 0.35, 0.2, 0.3]}
        position={[from + length / 2, DECK_TOP + RAILING_HEIGHT, z]}
        radius={0.08}
        color={COLORS.wood}
      />
      <Block
        size={[length, 0.12, 0.16]}
        position={[from + length / 2, DECK_TOP + RAILING_HEIGHT / 2, z]}
        radius={0.05}
        color={COLORS.wood}
      />
    </group>
  );
}

// The site's name on the halt, facing the track (-x), toward the +z end:
// seen in the arrival shot, out of HOME_VIEW_CAMERA's (it would hide the
// desk).
const SIGN = { x: 0.6, z: 5.9, width: 4.8, height: 1.1, top: 5.4 };

function NameSign() {
  const { x, z, width, height, top } = SIGN;
  const postHeight = top - DECK_TOP;
  return (
    <group>
      {[-1, 1].map((side) => (
        <Cylinder
          key={side}
          radius={0.13}
          height={postHeight}
          position={[
            x + 0.2,
            DECK_TOP + postHeight / 2,
            z + side * (width / 2 - 0.5),
          ]}
          color={COLORS.darkWood}
        />
      ))}
      <Block
        size={[0.2, height, width]}
        position={[x, top - height / 2, z]}
        radius={0.1}
        color={COLORS.sign}
      />
      <Block
        size={[0.6, 0.16, width + 0.4]}
        position={[x + 0.1, top + 0.08, z]}
        radius={0.07}
        color={COLORS.slate}
      />
      <Text
        font={SCENE_FONT}
        fontSize={0.42}
        letterSpacing={0.12}
        color={COLORS.ink}
        anchorX="center"
        anchorY="middle"
        position={[x - 0.11, top - height / 2 - 0.02, z]}
        rotation-y={-Math.PI / 2}
      >
        {site.name.toUpperCase()}
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------- house

// Horizontal boards over the cladding, on the front and both gables. No
// snow: it would stripe the walls.
const BOARD_GAP = 0.6;

function Clapboards({ cx, base }: { cx: number; base: number }) {
  const rise = (HOUSE.depth / 2) * Math.tan(HOUSE.pitch);
  const rows: { y: number; width: number }[] = [];
  for (let y = 0.45; ; y += BOARD_GAP) {
    const above = y - HOUSE.wall;
    const width =
      above < 0 ? HOUSE.depth - 0.1 : HOUSE.depth * (1 - above / rise) - 0.5;
    if (width < 0.6) break;
    rows.push({ y, width });
  }
  const front = HOUSE.length - 2 * HOUSE_BEVEL - 0.1;
  return (
    <NoSnow>
      {rows.map(({ y, width }) => (
        <group key={y}>
          {y < HOUSE.wall && (
            <Block
              size={[0.1, 0.13, front]}
              position={[FRONT - 0.03, base + y, 0]}
              radius={0.05}
              color={COLORS.board}
            />
          )}
          {[-1, 1].map((side) => (
            <Block
              key={side}
              size={[width, 0.13, 0.1]}
              position={[cx, base + y, side * (HOUSE.length / 2 + 0.03)]}
              radius={0.05}
              color={COLORS.board}
            />
          ))}
        </group>
      ))}
    </NoSnow>
  );
}

// The house's lights, kept soft: the windows' glow, the wall lantern's, its
// light's intensity and reach (world units), held out in front of it (home
// units) so it doesn't burn a hot spot into the wall; the terrace lamp's
// brightness.
const WINDOW_GLOW = 0.6;
const LANTERN_GLOW = 0.9;
const LANTERN_INTENSITY = 0.25;
const LANTERN_DISTANCE = 1;
const LANTERN_LIGHT: Vec3 = [-1.4, -0.4, 0];
const LAMP_BRIGHTNESS = 0.35;

// Wall lantern by the door, on a bracket, lit with the house.
function WallLantern({
  position,
  lit,
  pop,
}: {
  position: Vec3;
  lit: boolean;
  pop: SpringValue<number>;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  // Kept dark until the house has popped in.
  useFrame(() => {
    const light = lightRef.current;
    if (light) {
      light.intensity = lit ? Math.max(pop.get(), 0) * LANTERN_INTENSITY : 0;
    }
  });
  const { color, emissive } = glass(lit, LANTERN_GLOW);
  return (
    <group position={position}>
      <Block
        size={[0.75, 0.12, 0.12]}
        position={[0.35, 0.5, 0]}
        radius={0.05}
        color={COLORS.iron}
      />
      <RoundedBox args={[0.45, 0.6, 0.45]} radius={0.1}>
        <meshStandardMaterial
          color={color}
          roughness={0.75}
          emissive={color}
          emissiveIntensity={emissive}
        />
      </RoundedBox>
      <Cylinder
        radius={0.42}
        top={0.1}
        height={0.3}
        position={[0, 0.45, 0]}
        rotation={[0, Math.PI / 4, 0]}
        color={COLORS.iron}
        segments={4}
      />
      <Block
        size={[0.52, 0.08, 0.52]}
        position={[0, -0.33, 0]}
        radius={0.03}
        color={COLORS.iron}
      />
      <pointLight
        ref={lightRef}
        position={LANTERN_LIGHT}
        color={COLORS.light}
        intensity={0}
        distance={LANTERN_DISTANCE}
      />
    </group>
  );
}

// Shutters either side of the front window, hinged on their outer edges,
// swinging shut when the lights go out. Each sits a little off its hinge,
// flat against the wall open and clear of the window's frame shut.
const SHUTTER = {
  width: 1,
  height: 2.1,
  thickness: 0.14,
  hinge: 1,
  x: FRONT - 0.29,
  offset: 0.15,
  // The second one follows the first by this much (ms).
  lag: 90,
};
const SHUTTER_SPRING = { tension: 170, friction: 20, clamp: true };

function Shutters({ y, shut }: { y: number; shut: boolean }) {
  const reducedMotion = useReducedMotion();
  // 0 open, 1 shut, the -z one first; clamped, so they don't swing past.
  const [springs] = useSprings(
    2,
    (i) => ({
      turn: shut ? 1 : 0,
      delay: i * SHUTTER.lag,
      immediate: reducedMotion,
      config: SHUTTER_SPRING,
    }),
    [shut],
  );
  return (
    <>
      {[-1, 1].map((side, i) => (
        <animated.group
          key={side}
          position={[SHUTTER.x, y, WINDOW_Z + side * SHUTTER.hinge]}
          rotation-y={springs[i].turn.to((t) => -side * Math.PI * t)}
        >
          <Block
            size={[SHUTTER.thickness, SHUTTER.height, SHUTTER.width]}
            position={[SHUTTER.offset, 0, (side * SHUTTER.width) / 2]}
            radius={0.07}
            color={COLORS.door}
          />
        </animated.group>
      ))}
    </>
  );
}

function House({ pop }: { pop: SpringValue<number> }) {
  const house = useHouseGeometry({ ...HOUSE, bevel: HOUSE_BEVEL });
  const half = HOUSE.depth / 2;
  const cx = HOUSE.x + half;
  const base = DECK_TOP;
  const rise = half * Math.tan(HOUSE.pitch);
  const slopeLength = (half + EAVE) / Math.cos(HOUSE.pitch);
  const roofRise = (half + EAVE) * Math.tan(HOUSE.pitch);
  const chimney = { x: cx + 1.1, z: -3.6, top: base + HOUSE.wall + 2.6 };
  // Its lights go out on a click and its shutters close, and the other way
  // round on the next one or when the train leaves.
  const [lit, setLit] = useState(true);
  const { bind, atStop } = useStationClick(() => setLit((on) => !on), {
    wiggle: false,
  });
  if (!atStop && !lit) setLit(true);
  const lights = glass(lit, WINDOW_GLOW);

  return (
    <group>
      {/* Stone plinth and doormat: the terrace's floor as much as the
          house's, so left out of the click. */}
      <group>
        <Block
          size={[
            HOUSE.depth + 2 * PLINTH_OUT,
            DECK_TOP,
            HOUSE.length + 2 * PLINTH_OUT,
          ]}
          position={[cx, DECK_TOP / 2, 0]}
          radius={0.2}
          color={COLORS.stone}
        />
        <NoSnow>
          <Block
            size={[1.1, 0.06, 1.7]}
            position={[FRONT - 0.75, DECK_TOP + 0.03, DOOR_Z]}
            radius={0.03}
            color={COLORS.pot}
          />
        </NoSnow>
      </group>
      <group {...bind}>
        <mesh
          geometry={house}
          position={[cx, base, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            {...snowy}
            color={COLORS.cladding}
            roughness={0.85}
          />
        </mesh>
        <Clapboards cx={cx} base={base} />

        {/* Roof: two slate slabs meeting at the ridge, eaves overhanging,
            a rounded ridge cap over the join. */}
        {[-1, 1].map((side) => (
          <group
            key={side}
            position={[
              cx + (side * (half + EAVE)) / 2,
              base +
                HOUSE.wall -
                EAVE * Math.tan(HOUSE.pitch) +
                roofRise / 2 +
                0.2,
              0,
            ]}
            rotation-z={-side * HOUSE.pitch}
          >
            <Block
              size={[slopeLength + 0.3, 0.35, HOUSE.length + 1.4]}
              radius={0.15}
              color={COLORS.slate}
            />
          </group>
        ))}
        <Cylinder
          radius={0.26}
          height={HOUSE.length + 1.5}
          position={[cx, base + HOUSE.wall + rise + 0.33, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          color={COLORS.ridge}
        />
        {/* Chimney, on the back slope, with a wider cap */}
        <Block
          size={[0.9, 2.4, 0.9]}
          position={[chimney.x, chimney.top - 1.2, chimney.z]}
          radius={0.15}
          color={COLORS.stone}
        />
        <Block
          size={[1.15, 0.25, 1.15]}
          position={[chimney.x, chimney.top + 0.1, chimney.z]}
          radius={0.1}
          color={COLORS.stoneDark}
        />

        {/* Front, toward the terrace: a shuttered window behind the desk,
            the door with a lit pane, the lantern. */}
        <Window
          position={[FRONT - 0.05, base + 2.4, WINDOW_Z]}
          lit={lit}
          glow={WINDOW_GLOW}
          frame={COLORS.sign}
        />
        <Shutters y={base + 2.4} shut={!lit} />
        <Block
          size={[0.3, 3.3, 2.2]}
          position={[FRONT - 0.05, base + 1.65, DOOR_Z]}
          radius={0.12}
          color={COLORS.sign}
        />
        <Block
          size={[0.25, 3, 1.8]}
          position={[FRONT - 0.15, base + 1.5, DOOR_Z]}
          radius={0.1}
          color={COLORS.door}
        />
        <Block
          size={[0.1, 0.8, 1.1]}
          position={[FRONT - 0.3, base + 2.3, DOOR_Z]}
          radius={0.06}
          {...lights}
        />
        <Block
          size={[0.1, 0.9, 1.1]}
          position={[FRONT - 0.3, base + 0.85, DOOR_Z]}
          radius={0.06}
          color={COLORS.doorPanel}
        />
        <mesh position={[FRONT - 0.38, base + 1.5, DOOR_Z + 0.6]} castShadow>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial
            {...snowy}
            color={COLORS.edge}
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
        <WallLantern
          position={[FRONT - 0.75, base + 3.1, LANTERN_Z]}
          lit={lit}
          pop={pop}
        />

        {/* -z gable, toward the camera side: a window, and a round one in
            the attic. */}
        <group
          position={[cx, base + 2.4, -HOUSE.length / 2 - 0.05]}
          rotation-y={-Math.PI / 2}
        >
          <Window
            position={[0, 0, 0]}
            lit={lit}
            glow={WINDOW_GLOW}
            frame={COLORS.sign}
          />
        </group>
        <group
          position={[cx, base + HOUSE.wall + 0.45, -HOUSE.length / 2 - 0.05]}
          rotation-x={Math.PI / 2}
        >
          <Cylinder
            radius={0.55}
            height={0.3}
            color={COLORS.sign}
            segments={24}
          />
          <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.2, 24]} />
            <meshStandardMaterial
              color={lights.color}
              emissive={lights.color}
              emissiveIntensity={lights.emissive}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- home

// Clear of the wall, so its light doesn't wash the front out.
const LAMP: Vec3 = [6.9, DECK_TOP, -6.4];
const PLANTERS: { at: Vec3; size: number }[] = [
  { at: [8.3, DECK_TOP, 5.4], size: 0.75 },
  // Out of the shutter's swing.
  { at: [8.4, DECK_TOP, -6], size: 0.6 },
];
const MAILBOX: Vec3 = [0.9, DECK_TOP, -7.4];
// In front of the lamp, clear of the desk.
const PADDLE_AT: Vec3 = [4.3, DECK_TOP, -3.8];

// The halt, terrace, railings and sign (there as the halt slides in), the
// house and props popping in by their spring in `pops`.
export default function HomeDecor({
  scale,
  pops,
}: {
  scale: number;
  pops: Record<Fitting, SpringValue<number>>;
}) {
  const railFrom = TERRACE.x + 0.5;
  const railTo = TERRACE.x + TERRACE.width - 0.6;
  const railZ = TERRACE.length / 2 - 0.25;
  return (
    <group scale={scale}>
      <Deck
        x={HALT.x}
        width={HALT.width}
        length={HALT.length}
        along="z"
        shades={COLORS.halt}
      />
      {/* Yellow line along the track side, swept as the planks */}
      <NoSnow>
        <Block
          size={[0.35, 0.05, HALT.length - 1.2]}
          position={[HALT.x + 0.45, DECK_TOP + 0.02, 0]}
          radius={0.02}
          color={COLORS.edge}
        />
      </NoSnow>
      <Deck
        x={TERRACE.x}
        width={TERRACE.width}
        length={TERRACE.length}
        along="x"
        shades={COLORS.terrace}
      />
      {[-1, 1].map((side) => (
        <Railing key={side} z={side * railZ} from={railFrom} to={railTo} />
      ))}
      <NameSign />

      <Pop feet={[HOUSE.x + HOUSE.depth / 2, 0, 0]} pop={pops.house}>
        <House pop={pops.house} />
      </Pop>
      <Pop feet={LAMP} pop={pops.lamp}>
        <Lamp position={LAMP} pop={pops.lamp} brightness={LAMP_BRIGHTNESS} />
      </Pop>
      {PLANTERS.map(({ at, size }) => (
        <Pop key={at.join()} feet={at} pop={pops.planters}>
          <Planter position={at} size={size} />
        </Pop>
      ))}
      <Pop feet={PADDLE_AT} pop={pops.paddle}>
        <PingPong position={PADDLE_AT} yaw={0.7} />
      </Pop>
      <Pop feet={MAILBOX} pop={pops.mailbox}>
        <Mailbox position={MAILBOX} />
      </Pop>
    </group>
  );
}
