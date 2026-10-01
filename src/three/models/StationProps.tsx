import { useRef, type ReactNode, type RefObject } from "react";
import { RoundedBox } from "@react-three/drei";
import type { SpringValue } from "@react-spring/three";
import * as THREE from "three";
import useStationProp from "../hooks/useStationProp";
import { snowy } from "../shaders/snow";
import HintOrb from "./HintOrb";
import {
  Block,
  Cylinder,
  FLOWER_COLORS,
  NoSnow,
  STATION_COLORS as COLORS,
  type Vec3,
} from "./StationPrimitives";

// The props of the station and the home (see StationDecor and HomeDecor,
// which place them), each playing a little animation when clicked while the
// train waits there: the clock spins its hands, a lamp blinks out, the bin
// tips over, the suitcase opens, the mailbox opens on its letters, the
// ping-pong paddle plays a little rally with its ball, the bench and
// planters hop. With reduced motion, movements jump straight to their end
// (or are left out when they are only a flourish). Same units as
// StationDecor.

const TAU = Math.PI * 2;

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const easeIn = (x: number) => x * x;
const easeInOut = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
const easeOutBack = (x: number) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;

// Progress (0 to 1) of a step starting `start` seconds into an animation and
// lasting `duration`; with `jump` (reduced motion), 0 then 1 at once.
function span(t: number, start: number, duration: number, jump = false) {
  if (jump) return t >= start ? 1 : 0;
  return clamp01((t - start) / duration);
}

// ---------------------------------------------------------------- clock

// Shakes, then the hands race round as if a whole day went by before
// landing back on the time (seconds): the hour hand makes a full turn, the
// minute hand `minuteTurns` (not the real 12, which would just blur). The
// shake is left out with reduced motion.
const CLOCK_SPIN = {
  shake: 0.5,
  shakeSpeed: 40,
  shakeAngle: 0.07,
  spinAt: 0.35,
  spin: 2.4,
  minuteTurns: 5,
  duration: 2.8,
};
const CLOCK_HANDS = [
  { length: 0.38, width: 0.08, x: -0.19 },
  { length: 0.52, width: 0.06, x: -0.22 },
];
// The bracket's top, which the clock shakes about.
const CLOCK_HANG = 1.2;

// Hung under the canopy, its face toward the track (-x), showing the real
// time. Hands turn about x: from the track, a positive turn reads
// clockwise.
export function Clock({ position }: { position: Vec3 }) {
  const bodyRef = useRef<THREE.Group>(null);
  const handRefs = useRef<(THREE.Group | null)[]>([]);
  const { bind, pose, hint } = useStationProp(
    CLOCK_SPIN.duration,
    (t, reducedMotion) => {
      const now = new Date();
      const minutes = now.getMinutes() + now.getSeconds() / 60;
      const hours = (now.getHours() % 12) + minutes / 60;
      let spin = 0;
      let shake = 0;
      if (t !== null) {
        spin = easeInOut(span(t, CLOCK_SPIN.spinAt, CLOCK_SPIN.spin));
        if (!reducedMotion) {
          const fade = 1 - span(t, 0, CLOCK_SPIN.shake);
          shake =
            CLOCK_SPIN.shakeAngle *
            fade *
            Math.sin(t * CLOCK_SPIN.shakeSpeed);
        }
      }
      const [hour, minute] = handRefs.current;
      if (hour) hour.rotation.x = TAU * (hours / 12 + spin);
      if (minute) {
        minute.rotation.x =
          TAU * (minutes / 60 + CLOCK_SPIN.minuteTurns * spin);
      }
      if (bodyRef.current) bodyRef.current.rotation.x = shake;
    },
    // Swings about its bracket's top, where it hangs.
    { pivot: [0, CLOCK_HANG, 0] },
  );

  return (
    <group position={position} {...bind}>
      <group ref={pose}>
        <group ref={bodyRef} position={[0, CLOCK_HANG, 0]}>
          <group position={[0, -CLOCK_HANG, 0]}>
            {/* Bracket down from the canopy */}
            <Cylinder
              radius={0.06}
              height={0.5}
              position={[0, 0.95, 0]}
              color={COLORS.iron}
            />
            <group rotation-z={Math.PI / 2}>
              <Cylinder
                radius={0.7}
                height={0.3}
                color={COLORS.iron}
                segments={24}
              />
              <Cylinder
                radius={0.58}
                height={0.32}
                color={COLORS.sign}
                segments={24}
              />
            </group>
            {/* Hour then minute hand, each with a short tail past the pivot,
                and a cap over it. */}
            {CLOCK_HANDS.map(({ length, width, x }, i) => (
              <group
                key={x}
                position={[x, 0, 0]}
                ref={(hand) => {
                  handRefs.current[i] = hand;
                }}
              >
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
        </group>
      </group>
      {/* Up over the canopy it hangs from (its underside is just above
          the bracket), on the track side. */}
      <HintOrb hint={hint} position={[-0.3, 1.75, 0]} />
    </group>
  );
}

// ---------------------------------------------------------------- lamp

// Lamps: post height (the lantern sits on top), and their warm light's
// intensity and reach (world units).
const LAMP_HEIGHT = 4.6;
const LAMP_INTENSITY = 4;
const LAMP_DISTANCE = 2.5;
const LAMP_GLOW = 2;
// Blinking out: [seconds from the click, light level] steps, the last one
// held. It crackles, stays off a moment, then comes back on. With reduced
// motion, just off then on.
const LAMP_BLINK = {
  steps: [
    [0, 0.3],
    [0.06, 1],
    [0.12, 0.15],
    [0.2, 0.9],
    [0.26, 0.05],
    [0.34, 0.7],
    [0.4, 0],
    [0.5, 0.45],
    [0.55, 0],
    [1.9, 0.4],
    [1.96, 0],
    [2.04, 1],
  ],
  reduced: [
    [0, 0],
    [1.9, 1],
  ],
  duration: 2.2,
} satisfies Record<string, [number, number][] | number>;
const LANTERN_OFF = new THREE.Color(COLORS.glassOff);
const LANTERN_ON = new THREE.Color(COLORS.light);

// Lit as it pops in (`pop`, its fitting's spring).
// `brightness` scales its light and its lantern's glow (dimmer by a
// house's wall than out on the platform).
export function Lamp({
  position,
  pop,
  brightness = 1,
}: {
  position: Vec3;
  pop: SpringValue<number>;
  brightness?: number;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const lanternRef = useRef<THREE.MeshStandardMaterial>(null);
  const { bind, pose, hint } = useStationProp(
    LAMP_BLINK.duration,
    (t, reducedMotion) => {
      let level = 1;
      if (t !== null) {
        const steps = reducedMotion ? LAMP_BLINK.reduced : LAMP_BLINK.steps;
        for (const [at, value] of steps) if (t >= at) level = value;
      }
      const light = lightRef.current;
      if (light) {
        light.intensity =
          Math.max(pop.get(), 0) * LAMP_INTENSITY * brightness * level;
      }
      const lantern = lanternRef.current;
      if (lantern) {
        lantern.color.lerpColors(LANTERN_OFF, LANTERN_ON, level);
        lantern.emissiveIntensity = LAMP_GLOW * brightness * level;
      }
    },
  );

  return (
    <group position={position} {...bind}>
      <group ref={pose}>
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
          <RoundedBox
            args={[0.5, 0.65, 0.5]}
            radius={0.12}
            smoothness={3}
            castShadow
          >
            <meshStandardMaterial
              ref={lanternRef}
              color={COLORS.light}
              roughness={0.75}
              emissive={COLORS.light}
              emissiveIntensity={LAMP_GLOW * brightness}
            />
          </RoundedBox>
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
            <meshStandardMaterial {...snowy} color={COLORS.iron} />
          </mesh>
          <Block
            size={[0.62, 0.08, 0.62]}
            position={[0, -0.36, 0]}
            radius={0.03}
            color={COLORS.iron}
          />
          <pointLight
            ref={lightRef}
            color={COLORS.light}
            intensity={0}
            distance={LAMP_DISTANCE}
          />
        </group>
      </group>
      <HintOrb hint={hint} position={[0, LAMP_HEIGHT + 1.5, 0]} />
    </group>
  );
}

// ---------------------------------------------------------------- trash can

const BIN = { radius: 0.42, top: 0.48, height: 1.2 };
// Tipped over, resting on its side (a little short of a quarter turn: it
// widens toward the top).
const BIN_FALLEN = Math.PI / 2 - 0.08;
// The lid swings open about its hinge, on the track side.
const BIN_LID_OPEN = 2;
// Timeline (seconds): it falls toward -z and bounces, the lid swings open,
// the litter spills out one piece after the other; then the litter vanishes,
// the lid closes and the can rights itself.
const BIN_SPILL = {
  fall: 0.4,
  bounce: 0.25,
  lidAt: 0.4,
  lid: 0.4,
  litterAt: 0.5,
  litterGap: 0.07,
  flight: 0.45,
  restoreAt: 1.8,
  clear: 0.3,
  riseAt: 1.95,
  rise: 0.6,
  duration: 2.6,
};
// Height the litter rests at: the paving's top.
const PAVING = 0.05;
// Spilled litter: from just inside the fallen can's mouth to the ground in
// front of it, tumbling on the way (`turn`, radians about x), landing turned
// `yaw` about y.
const LITTER: {
  kind: "paper" | "can" | "newspaper" | "core";
  from: Vec3;
  to: Vec3;
  turn: number;
  yaw: number;
}[] = [
  {
    kind: "paper",
    from: [-0.1, 0.5, -1.3],
    to: [-0.4, 0.14, -2.2],
    turn: 5,
    yaw: 0.4,
  },
  {
    kind: "can",
    from: [0.05, 0.45, -1.3],
    to: [0.1, 0.09, -2.0],
    turn: 4,
    yaw: 0.9,
  },
  {
    kind: "newspaper",
    from: [0, 0.55, -1.3],
    to: [-0.05, 0.015, -2.8],
    turn: 3,
    yaw: -0.3,
  },
  {
    kind: "paper",
    from: [0.15, 0.5, -1.3],
    to: [0.45, 0.11, -2.5],
    turn: 6,
    yaw: 1.2,
  },
  {
    kind: "core",
    from: [-0.05, 0.45, -1.3],
    to: [0.3, 0.1, -1.9],
    turn: 2,
    yaw: 0,
  },
];

function LitterItem({ kind }: { kind: (typeof LITTER)[number]["kind"] }) {
  switch (kind) {
    case "paper":
      return (
        <mesh castShadow>
          <icosahedronGeometry args={[0.13, 0]} />
          <meshStandardMaterial color="#f4efe4" roughness={0.9} flatShading />
        </mesh>
      );
    case "can":
      return (
        <Cylinder
          radius={0.09}
          height={0.26}
          rotation={[0, 0, Math.PI / 2]}
          color="#c9463d"
        />
      );
    case "newspaper":
      return (
        <Block size={[0.42, 0.03, 0.32]} radius={0.01} color="#e8e2d0" />
      );
    case "core":
      return (
        <mesh castShadow scale={[0.8, 1, 0.8]}>
          <sphereGeometry args={[0.1, 10, 8]} />
          <meshStandardMaterial color="#e9d49a" roughness={0.8} />
        </mesh>
      );
  }
}

export function TrashCan({ position }: { position: Vec3 }) {
  const tipRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const litterRefs = useRef<(THREE.Group | null)[]>([]);
  const { bind, pose, hint } = useStationProp(BIN_SPILL.duration, (t, jump) => {
    let tip = 0;
    let lid = 0;
    if (t !== null) {
      const fall = easeIn(span(t, 0, BIN_SPILL.fall, jump));
      const bounce = jump
        ? 0
        : 0.1 * Math.sin(Math.PI * span(t, BIN_SPILL.fall, BIN_SPILL.bounce));
      const rise = span(t, BIN_SPILL.riseAt, BIN_SPILL.rise, jump);
      const righted = jump ? rise : easeOutBack(rise);
      tip = BIN_FALLEN * (fall - bounce) * (1 - righted);
      const open = span(t, BIN_SPILL.lidAt, BIN_SPILL.lid, jump);
      const close = span(t, BIN_SPILL.restoreAt, BIN_SPILL.clear, jump);
      lid =
        BIN_LID_OPEN *
        (jump ? open : easeOutBack(open)) *
        (1 - easeInOut(close));
    }
    if (tipRef.current) tipRef.current.rotation.x = -tip;
    if (lidRef.current) lidRef.current.rotation.z = lid;

    LITTER.forEach(({ from, to, turn, yaw }, i) => {
      const item = litterRefs.current[i];
      if (!item) return;
      if (t === null) {
        item.visible = false;
        return;
      }
      const start = BIN_SPILL.litterAt + i * BIN_SPILL.litterGap;
      const s = span(t, start, BIN_SPILL.flight, jump);
      const size = 1 - span(t, BIN_SPILL.restoreAt, BIN_SPILL.clear, jump);
      item.visible = t >= start && size > 0;
      item.scale.setScalar(size);
      item.position.set(
        THREE.MathUtils.lerp(from[0], to[0], s),
        THREE.MathUtils.lerp(from[1], to[1] + PAVING, s) +
          0.35 * 4 * s * (1 - s),
        THREE.MathUtils.lerp(from[2], to[2], s),
      );
      item.rotation.set((1 - s) * turn, yaw * s, 0);
    });
  });

  return (
    <group position={position} {...bind}>
      <group ref={pose}>
        {/* Tips about its bottom edge on the -z side. */}
        <group ref={tipRef} position={[0, 0, -BIN.radius]}>
          <group position={[0, 0, BIN.radius]}>
            <Cylinder
              radius={BIN.radius}
              top={BIN.top}
              height={BIN.height}
              position={[0, BIN.height / 2, 0]}
              color={COLORS.bin}
            />
            <mesh
              position={[0, BIN.height, 0]}
              rotation-x={Math.PI / 2}
              castShadow
            >
              <torusGeometry args={[BIN.top, 0.07, 8, 20]} />
              <meshStandardMaterial
                {...snowy}
                color={COLORS.iron}
                roughness={0.6}
              />
            </mesh>
            <group ref={lidRef} position={[-BIN.top, BIN.height, 0]}>
              <mesh
                position={[BIN.top, 0.02, 0]}
                scale={[1, 0.45, 1]}
                castShadow
              >
                <sphereGeometry
                  args={[0.46, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]}
                />
                <meshStandardMaterial
                  {...snowy}
                  color={COLORS.bin}
                  roughness={0.7}
                />
              </mesh>
            </group>
          </group>
        </group>
        {LITTER.map(({ kind }, i) => (
          <group
            key={i}
            visible={false}
            ref={(item) => {
              litterRefs.current[i] = item;
            }}
          >
            <LitterItem kind={kind} />
          </group>
        ))}
      </group>
      <HintOrb hint={hint} position={[0, BIN.height + 0.5, 0]} />
    </group>
  );
}

// ---------------------------------------------------------------- luggage

// Suitcase lying on the trunk, hollow, its lid hinged at the back (+x).
const SUITCASE = {
  width: 0.9,
  length: 1.15,
  depth: 0.3,
  lid: 0.14,
  wall: 0.07,
};
// Opens about its hinge, lid thrown back, then closes (seconds).
const SUITCASE_OPEN = {
  angle: 1.95,
  open: 0.55,
  closeAt: 2.75,
  close: 0.35,
  duration: 3.15,
};
// Meanwhile its contents jump out one after the other (`gap` apart),
// growing `grow` times bigger and spreading apart, float a moment, tipped
// toward the track to show themselves, and drop back in before the lid
// closes (seconds). Left in place with reduced motion.
const CONTENTS_JUMP = {
  at: 0.2,
  gap: 0.15,
  rise: 0.4,
  fallAt: 1.8,
  fall: 0.3,
  tip: 0.5,
  grow: 1.75,
  bob: 0.02,
  bobSpeed: 5,
};
// How high each item jumps, how far it drifts away from the others
// (x, z) and turns about y on the way.
const CONTENTS: { height: number; drift: [number, number]; spin: number }[] =
  [
    { height: 0.4, drift: [-0.15, -0.35], spin: 0.3 },
    { height: 0.85, drift: [0.2, -0.3], spin: -0.4 },
    { height: 0.6, drift: [-0.2, 0.35], spin: 0.6 },
    { height: 1.05, drift: [0.2, 0.35], spin: -0.3 },
  ];
const easeOut = (x: number) => 1 - (1 - x) ** 2;

// What's packed, on the suitcase's floor: a folded shirt, a book, a few
// papers and an alarm clock, each in its own group (`itemRefs`, in
// CONTENTS order) centred on it, so it can jump.
function SuitcaseContents({
  itemRefs,
}: {
  itemRefs: RefObject<(THREE.Group | null)[]>;
}) {
  const floor = SUITCASE.wall - 0.01;
  const item = (i: number) => (group: THREE.Group | null) => {
    itemRefs.current[i] = group;
  };
  return (
    <group position={[0, floor, 0]}>
      {/* Folded shirt, collar toward the track */}
      <group position={[-0.1, 0.05, -0.25]} ref={item(0)}>
        <Block size={[0.42, 0.1, 0.42]} radius={0.04} color="#8fb3d9" />
        <Block
          size={[0.08, 0.05, 0.24]}
          position={[-0.16, 0.06, 0]}
          radius={0.02}
          color="#f7f3ea"
        />
      </group>
      {/* Book: cover, and its pages showing on three sides */}
      <group position={[0.15, 0.045, -0.2]} rotation-y={0.2} ref={item(1)}>
        <Block size={[0.26, 0.09, 0.34]} radius={0.015} color="#7a2f3a" />
        <Block
          size={[0.25, 0.06, 0.31]}
          position={[-0.015, 0, 0]}
          radius={0.01}
          color="#f4ecd8"
        />
      </group>
      {/* Loose papers */}
      <group position={[-0.12, 0.016, 0.255]} ref={item(2)}>
        <Block
          size={[0.26, 0.015, 0.34]}
          position={[-0.02, -0.008, -0.015]}
          rotation={[0, -0.2, 0]}
          radius={0.005}
          color="#fbf7ee"
        />
        <Block
          size={[0.26, 0.015, 0.34]}
          position={[0.02, 0.008, 0.015]}
          rotation={[0, 0.15, 0]}
          radius={0.005}
          color="#f1ead9"
        />
      </group>
      {/* Alarm clock, face toward the track, two bells on top */}
      <group position={[0.16, 0.11, 0.26]} ref={item(3)}>
        <Cylinder
          radius={0.1}
          height={0.07}
          rotation={[0, 0, Math.PI / 2]}
          color="#4f7d4c"
          segments={20}
        />
        <Cylinder
          radius={0.08}
          height={0.02}
          position={[-0.035, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          color="#fbf7ee"
          segments={20}
        />
        {[-0.06, 0.06].map((z) => (
          <mesh key={z} position={[0, 0.09, z]} castShadow>
            <sphereGeometry args={[0.04, 10, 6, 0, TAU, 0, Math.PI / 2]} />
            <meshStandardMaterial
              {...snowy}
              color={COLORS.edge}
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Luggage({ position }: { position: Vec3 }) {
  const lidRef = useRef<THREE.Group>(null);
  const itemRefs = useRef<(THREE.Group | null)[]>([]);
  // Where each item rests, read once they're mounted.
  const restRef = useRef<THREE.Vector3[] | null>(null);
  const restYawRef = useRef<number[]>([]);
  const { bind, pose, hint } = useStationProp(
    SUITCASE_OPEN.duration,
    (t, jump) => {
      let open = 0;
      if (t !== null) {
        const opening = span(t, 0, SUITCASE_OPEN.open, jump);
        const closing = span(
          t,
          SUITCASE_OPEN.closeAt,
          SUITCASE_OPEN.close,
          jump,
        );
        open = (jump ? opening : easeOutBack(opening)) * (1 - easeIn(closing));
      }
      if (lidRef.current) {
        lidRef.current.rotation.z = -SUITCASE_OPEN.angle * open;
      }

      const items = itemRefs.current;
      if (!restRef.current) {
        restRef.current = items.map(
          (item) => item?.position.clone() ?? new THREE.Vector3(),
        );
        restYawRef.current = items.map((item) => item?.rotation.y ?? 0);
      }
      CONTENTS.forEach(({ height, drift, spin }, i) => {
        const item = items[i];
        const rest = restRef.current?.[i];
        if (!item || !rest) return;
        let lift = 0;
        let bob = 0;
        if (t !== null && !jump) {
          const delay = i * CONTENTS_JUMP.gap;
          const up = span(t, CONTENTS_JUMP.at + delay, CONTENTS_JUMP.rise);
          const down = span(
            t,
            CONTENTS_JUMP.fallAt + delay,
            CONTENTS_JUMP.fall,
          );
          lift = easeOut(up) * (1 - easeIn(down));
          bob =
            CONTENTS_JUMP.bob *
            Math.sin(t * CONTENTS_JUMP.bobSpeed + i) *
            Math.min(up, 1 - down);
        }
        item.position.set(
          rest.x + drift[0] * lift,
          rest.y + height * lift + bob,
          rest.z + drift[1] * lift,
        );
        item.rotation.y = restYawRef.current[i] + spin * lift;
        item.rotation.z = CONTENTS_JUMP.tip * lift;
        item.scale.setScalar(1 + (CONTENTS_JUMP.grow - 1) * lift);
      });
    },
  );
  const { width, length, depth, lid, wall } = SUITCASE;

  return (
    <group position={position} {...bind}>
      <group ref={pose}>
        <Block
          size={[0.95, 0.75, 1.3]}
          position={[0, 0.375, 0]}
          radius={0.15}
          color={COLORS.trunk}
        />
        {[-0.35, 0.35].map((z) => (
          <Block
            key={z}
            size={[0.97, 0.77, 0.14]}
            position={[0, 0.375, z]}
            radius={0.05}
            color={COLORS.strap}
          />
        ))}
        <group position={[0.02, 0.77, 0.05]} rotation-y={0.25}>
          {/* Hollow shell: lined floor, then four walls. What's inside, the
              lining and contents, keeps clear of the snow. */}
          <NoSnow>
            <Block
              size={[width, wall, length]}
              position={[0, wall / 2, 0]}
              radius={0.03}
              color={COLORS.lining}
            />
          </NoSnow>
          {[-1, 1].map((side) => (
            <group key={side}>
              <Block
                size={[wall, depth, length]}
                position={[(side * (width - wall)) / 2, depth / 2, 0]}
                radius={0.03}
                color={COLORS.suitcase}
              />
              <Block
                size={[width, depth, wall]}
                position={[0, depth / 2, (side * (length - wall)) / 2]}
                radius={0.03}
                color={COLORS.suitcase}
              />
              {/* Brass latches on the front */}
              <Block
                size={[0.03, 0.09, 0.08]}
                position={[-width / 2 - 0.01, depth, side * 0.33]}
                radius={0.01}
                color={COLORS.edge}
              />
            </group>
          ))}
          {/* Handle on the front */}
          <Block
            size={[0.05, 0.05, 0.3]}
            position={[-width / 2 - 0.07, depth * 0.6, 0]}
            radius={0.02}
            color={COLORS.strap}
          />
          {[-0.13, 0.13].map((z) => (
            <Block
              key={z}
              size={[0.08, 0.04, 0.04]}
              position={[-width / 2 - 0.03, depth * 0.6, z]}
              radius={0.01}
              color={COLORS.strap}
            />
          ))}
          <NoSnow>
            <SuitcaseContents itemRefs={itemRefs} />
          </NoSnow>
          {/* Lid, hinged along the back edge, lined inside */}
          <group ref={lidRef} position={[width / 2, depth, 0]}>
            <Block
              size={[width, lid, length]}
              position={[-width / 2, lid / 2, 0]}
              radius={0.05}
              color={COLORS.suitcase}
            />
            <NoSnow>
              <Block
                size={[width - 2 * wall, 0.02, length - 2 * wall]}
                position={[-width / 2, 0, 0]}
                radius={0.005}
                color={COLORS.lining}
              />
            </NoSnow>
          </group>
        </group>
      </group>
      <HintOrb hint={hint} position={[0, 1.6, 0]} />
    </group>
  );
}

// ---------------------------------------------------------------- mailbox

const MAILBOX = {
  post: 1.45,
  length: 1,
  height: 0.65,
  width: 0.6,
  // Wall thickness, corner radius, and the rounding of its edges.
  wall: 0.06,
  corner: 0.18,
  bevel: 0.015,
};

// A rounded rectangle, `width` (x) by `height` (y), centred on the origin.
function roundedRect<T extends THREE.Path>(
  path: T,
  width: number,
  height: number,
  radius: number,
) {
  const x = width / 2 - radius;
  const y = height / 2 - radius;
  path.moveTo(-x, -height / 2);
  path.lineTo(x, -height / 2);
  path.absarc(x, -y, radius, -Math.PI / 2, 0, false);
  path.lineTo(width / 2, y);
  path.absarc(x, y, radius, 0, Math.PI / 2, false);
  path.lineTo(-x, height / 2);
  path.absarc(-x, y, radius, Math.PI / 2, Math.PI, false);
  path.lineTo(-width / 2, -y);
  path.absarc(-x, -y, radius, Math.PI, Math.PI * 1.5, false);
  return path;
}

// The mailbox's body, a hollow tube open at both ends (its section: a
// rounded rectangle with a hole), and a plate of the same outline closing
// it (the back, and the door). Both with rounded edges, along x, centred on
// it and on z; the body centred on y, the plate from y = 0 up. Built once,
// shared by every mailbox (hence dispose={null} on the meshes).
let mailboxGeometries: {
  body: THREE.BufferGeometry;
  plate: THREE.BufferGeometry;
} | null = null;

function getMailboxGeometries() {
  if (!mailboxGeometries) {
    const { length, height, width, wall, corner, bevel } = MAILBOX;
    // The bevel grows the outline outward, and the hole inward, by `bevel`.
    const outline = () =>
      roundedRect(
        new THREE.Shape(),
        width - 2 * bevel,
        height - 2 * bevel,
        corner - bevel,
      );
    const extrude = (shape: THREE.Shape, depth: number) => {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 2,
        curveSegments: 10,
      });
      geometry.translate(0, 0, -depth / 2);
      // Extruded along z: turned so it runs along x.
      geometry.rotateY(Math.PI / 2);
      return geometry;
    };
    const section = outline();
    section.holes.push(
      roundedRect(
        new THREE.Path(),
        width - 2 * wall + 2 * bevel,
        height - 2 * wall + 2 * bevel,
        corner - wall + bevel,
      ),
    );
    const plate = extrude(outline(), wall - 2 * bevel);
    plate.translate(0, height / 2, 0);
    mailboxGeometries = {
      body: extrude(section, length - 2 * bevel),
      plate,
    };
  }
  return mailboxGeometries;
}
// Timeline (seconds): the door drops open flat, the letters slide out over
// it toward the track one after the other, fanning out unevenly, wait a
// moment, slide back in, and the door closes.
const MAIL = {
  door: 0.35,
  doorAngle: Math.PI / 2,
  slideAt: 0.2,
  slideGap: 0.09,
  slide: 0.45,
  backAt: 1.5,
  back: 0.35,
  closeAt: 1.9,
  close: 0.3,
  duration: 2.3,
};
// The stacked letters, bottom first, lying on the box's floor, a little
// askew: size (x along the box, z across), colour, where each rests (x, z,
// turn about y), how far it slides out (-x) and turns on the way; a stamp
// on some.
const LETTERS: {
  size: [number, number];
  color: string;
  out: number;
  turn: number;
  rest: { x: number; z: number; yaw: number };
  stamp?: boolean;
}[] = [
  {
    size: [0.56, 0.3],
    color: "#d9b98a",
    out: 0.36,
    turn: -0.38,
    rest: { x: -0.2, z: 0.01, yaw: 0.03 },
  },
  {
    size: [0.5, 0.27],
    color: COLORS.sign,
    out: 0.52,
    turn: 0.07,
    rest: { x: -0.18, z: -0.02, yaw: -0.02 },
    stamp: true,
  },
  {
    size: [0.52, 0.28],
    color: "#bcd3e6",
    out: 0.43,
    turn: 0.44,
    rest: { x: -0.21, z: 0.02, yaw: 0.04 },
  },
];
const LETTER_THICKNESS = 0.035;

// A yellow mailbox on a post, its door toward the track (-x), a red flag
// down on its +z side, and a few letters inside.
export function Mailbox({ position }: { position: Vec3 }) {
  const doorRef = useRef<THREE.Group>(null);
  const letterRefs = useRef<(THREE.Group | null)[]>([]);
  const { post, length, height, width, wall } = MAILBOX;
  const middle = post + height / 2;
  const { body, plate } = getMailboxGeometries();
  // The letters' floor: the box's, inside.
  const floor = post + wall;
  const { bind, pose, hint } = useStationProp(MAIL.duration, (t, jump) => {
    let door = 0;
    if (t !== null) {
      const open = span(t, 0, MAIL.door, jump);
      const close = span(t, MAIL.closeAt, MAIL.close, jump);
      door = (jump ? open : easeOutBack(open)) * (1 - easeInOut(close));
    }
    if (doorRef.current) doorRef.current.rotation.z = MAIL.doorAngle * door;
    LETTERS.forEach(({ out: distance, turn, rest }, i) => {
      const letter = letterRefs.current[i];
      if (!letter) return;
      let out = 0;
      if (t !== null) {
        const gap = i * MAIL.slideGap;
        const slide = span(t, MAIL.slideAt + gap, MAIL.slide, jump);
        const back = span(t, MAIL.backAt + gap / 2, MAIL.back, jump);
        out = (jump ? slide : easeOutBack(slide)) * (1 - easeInOut(back));
      }
      letter.position.x = rest.x - distance * out;
      letter.rotation.y = rest.yaw + turn * out;
    });
  });

  return (
    <group position={position} {...bind}>
      <group ref={pose}>
        <Cylinder
          radius={0.08}
          height={post}
          position={[0, post / 2, 0]}
          color={COLORS.darkWood}
        />
        {/* Hollow body, closed at the back */}
        <mesh
          geometry={body}
          dispose={null}
          position={[0, middle, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            {...snowy}
            color={COLORS.edge}
            roughness={0.75}
          />
        </mesh>
        {/* Back: the plate, a little smaller and set in, its edges hidden
            in the body's walls (not flush with them, which would flicker) */}
        <mesh
          geometry={plate}
          dispose={null}
          position={[length / 2 - wall / 2 - 0.01, post + 0.015 * height, 0]}
          scale={[1, 0.97, 0.97]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            {...snowy}
            color={COLORS.edge}
            roughness={0.75}
          />
        </mesh>
        {/* Door over the whole front, hinged along its bottom edge,
            dropping flat toward the track */}
        <group ref={doorRef} position={[-length / 2 - wall / 2, post, 0]}>
          <mesh geometry={plate} dispose={null} castShadow receiveShadow>
            <meshStandardMaterial color={COLORS.edge} roughness={0.75} />
          </mesh>
          <Block
            size={[0.05, 0.05, 0.14]}
            position={[-wall / 2 - 0.015, height - 0.12, 0]}
            radius={0.02}
            color={COLORS.iron}
          />
        </group>
        {/* Flag, down along its arm */}
        <group
          position={[0.25, middle, width / 2 + 0.04]}
          rotation-z={-Math.PI / 2}
        >
          <Block
            size={[0.06, 0.55, 0.05]}
            position={[0, 0.27, 0]}
            radius={0.02}
            color={COLORS.iron}
          />
          <Block
            size={[0.26, 0.2, 0.05]}
            position={[-0.12, 0.45, 0]}
            radius={0.02}
            color={COLORS.roof}
          />
        </group>
        {/* Letters, stacked inside, each turning about its centre, kept
            clear of the snow */}
        <NoSnow>
          {LETTERS.map(({ size, color, rest, stamp }, i) => (
            <group
              key={i}
              ref={(letter) => {
                letterRefs.current[i] = letter;
              }}
              position={[
                rest.x,
                floor + LETTER_THICKNESS * (i + 0.5),
                rest.z,
              ]}
              rotation-y={rest.yaw}
            >
              <Block
                size={[size[0], LETTER_THICKNESS, size[1]]}
                radius={0.012}
                color={color}
              />
              {stamp && (
                <Block
                  size={[0.09, 0.01, 0.08]}
                  position={[
                    -size[0] / 2 + 0.08,
                    LETTER_THICKNESS / 2,
                    size[1] / 2 - 0.07,
                  ]}
                  radius={0.004}
                  color={COLORS.roof}
                />
              )}
            </group>
          ))}
        </NoSnow>
      </group>
      <HintOrb hint={hint} position={[0, post + height + 0.6, 0]} />
    </group>
  );
}

// ---------------------------------------------------------------- ping-pong

// A ping-pong paddle left lying on the floor, red side up, its ball beside
// it; cartoon-sized (about twice a real one). In play: no snow on them.
const PADDLE = { radius: 0.26, rubber: 0.02, core: 0.03, handle: 0.36 };
const BALL_RADIUS = 0.07;
const BALL_REST: Vec3 = [-0.35, BALL_RADIUS, 0.5];
// Timeline (seconds): the paddle lifts off the floor, the ball hops onto
// it and bounces on it a few times (the paddle giving at each hit and
// rocking side to side), hops back to where it lay with a little rebound,
// and the paddle settles back down. Heights in the prop's units.
const RALLY = {
  lift: 0.9,
  rise: 0.35,
  hopOnAt: 0.15,
  hopOn: 0.4,
  hopOnHeight: 1.1,
  bounces: 3,
  bounce: 0.38,
  bounceHeight: 0.75,
  hopOff: 0.45,
  hopOffHeight: 1,
  rebound: 0.2,
  reboundHeight: 0.12,
  settleDelay: 0.15,
  settle: 0.4,
  give: 0.07,
  giveTime: 0.14,
  rock: 0.12,
};
// The ball's first and last touch on the paddle.
const RALLY_FIRST = RALLY.hopOnAt + RALLY.hopOn;
const RALLY_LAST = RALLY_FIRST + RALLY.bounces * RALLY.bounce;
const RALLY_DURATION = RALLY_LAST + RALLY.hopOff + RALLY.rebound + 0.05;
// A hop's height `p` of the way through it (0 to 1), peaking at 1.
const arc = (p: number) => 4 * p * (1 - p);
// Where the ball lies, and scratch space for where it sits on the blade:
// reused every frame, shared by every paddle (they animate one frame at a
// time).
const ballRest = new THREE.Vector3(...BALL_REST);
const ballOnBlade = new THREE.Vector3();

// Clicked, it plays a little rally on its own. Left still with reduced
// motion (only a flourish).
export function PingPong({ position, yaw }: { position: Vec3; yaw: number }) {
  const paddleRef = useRef<THREE.Group>(null);
  const ballRef = useRef<THREE.Group>(null);
  const { bind, pose, hint } = useStationProp(RALLY_DURATION, (t, still) => {
    const paddle = paddleRef.current;
    const ball = ballRef.current;
    if (!paddle || !ball) return;
    if (t === null || still) {
      paddle.position.y = 0;
      paddle.rotation.x = 0;
      ball.position.copy(ballRest);
      return;
    }

    // Paddle: up, giving under each touch of the ball, rocking while the
    // ball bounces, then back down.
    const up = easeOutBack(span(t, 0, RALLY.rise));
    const down = easeInOut(
      span(t, RALLY_LAST + RALLY.settleDelay, RALLY.settle),
    );
    const lift = RALLY.lift * up * (1 - down);
    const sinceTouch = (t - RALLY_FIRST) % RALLY.bounce;
    const touching = t >= RALLY_FIRST && t <= RALLY_LAST + RALLY.giveTime;
    const give = touching
      ? RALLY.give * Math.sin(Math.PI * clamp01(sinceTouch / RALLY.giveTime))
      : 0;
    const rallying = t >= RALLY_FIRST && t <= RALLY_LAST;
    paddle.position.y = lift - give;
    paddle.rotation.x = rallying
      ? RALLY.rock * Math.sin((Math.PI * (t - RALLY_FIRST)) / RALLY.bounce)
      : 0;

    // Ball: resting on the blade's top (its middle), or hopping from and
    // back to where it lay.
    const top = ballOnBlade.set(
      0,
      paddle.position.y + 2 * PADDLE.rubber + PADDLE.core + BALL_RADIUS,
      0,
    );
    const rest = ballRest;
    if (t < RALLY.hopOnAt) {
      ball.position.copy(rest);
    } else if (t < RALLY_FIRST) {
      const p = span(t, RALLY.hopOnAt, RALLY.hopOn);
      ball.position.lerpVectors(rest, top, p);
      ball.position.y += RALLY.hopOnHeight * arc(p);
    } else if (t < RALLY_LAST) {
      ball.position.copy(top);
      ball.position.y += RALLY.bounceHeight * arc(sinceTouch / RALLY.bounce);
    } else if (t < RALLY_LAST + RALLY.hopOff) {
      const p = span(t, RALLY_LAST, RALLY.hopOff);
      ball.position.lerpVectors(top, rest, p);
      ball.position.y += RALLY.hopOffHeight * arc(p);
    } else {
      const p = span(t, RALLY_LAST + RALLY.hopOff, RALLY.rebound);
      ball.position.copy(rest);
      ball.position.y += RALLY.reboundHeight * arc(p);
    }
  });
  const { radius, rubber, core, handle } = PADDLE;
  // Bottom up: black rubber, wood (a hair narrower), red rubber.
  const layers = [
    { color: COLORS.iron, bottom: 0, height: rubber, inset: 0 },
    { color: COLORS.benchWood, bottom: rubber, height: core, inset: 0.008 },
    { color: COLORS.roof, bottom: rubber + core, height: rubber, inset: 0 },
  ];

  return (
    <NoSnow>
      <group position={position} {...bind}>
        <group ref={pose}>
          <group rotation-y={yaw}>
            <group ref={paddleRef}>
              {/* Blade, a little oval */}
              <group scale={[1, 1, 1.08]}>
                {layers.map(({ color, bottom, height, inset }) => (
                  <Cylinder
                    key={color}
                    radius={radius - inset}
                    height={height}
                    position={[0, bottom + height / 2, 0]}
                    color={color}
                    segments={28}
                  />
                ))}
              </group>
              {/* Handle, off the blade's edge, a darker band where it's
                  held */}
              <Block
                size={[handle, 0.07, 0.1]}
                position={[radius + handle / 2 - 0.04, rubber + core / 2, 0]}
                radius={0.03}
                color={COLORS.lining}
              />
              <Block
                size={[0.14, 0.075, 0.105]}
                position={[radius + handle - 0.13, rubber + core / 2, 0]}
                radius={0.03}
                color={COLORS.wood}
              />
            </group>
          </group>
          <group ref={ballRef} position={BALL_REST}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[BALL_RADIUS, 16, 12]} />
              <meshStandardMaterial color="#f5a142" roughness={0.45} />
            </mesh>
          </group>
        </group>
        <HintOrb hint={hint} position={[0, 0.9, 0]} />
      </group>
    </NoSnow>
  );
}

// ---------------------------------------------------------------- hopping

// A little hop (seconds): crouch, jump, squash on landing and settle.
const HOP = { crouch: 0.08, air: 0.38, land: 0.24, duration: 0.7 };

// Height and vertical stretch (1 at rest) of a hop `t` seconds in.
function hopPose(t: number, height: number): [number, number] {
  if (t < HOP.crouch) return [0, 1 - 0.15 * (t / HOP.crouch)];
  const p = span(t, HOP.crouch, HOP.air);
  if (p < 1) {
    const unfold = 0.85 + 0.15 * Math.min(p * 4, 1);
    return [height * 4 * p * (1 - p), unfold + 0.12 * Math.sin(Math.PI * p)];
  }
  const q = span(t, HOP.crouch + HOP.air, HOP.land);
  return [0, 1 - 0.14 * Math.sin(Math.PI * q) * (1 - q)];
}

// Hops from its feet (`position`) when clicked, keeping its volume as it
// squashes and stretches. Left still with reduced motion.
function Hop({
  position,
  height,
  hintHeight,
  children,
}: {
  position: Vec3;
  height: number;
  // Height of its HintOrb, over its top.
  hintHeight: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const { bind, pose, hint } = useStationProp(
    HOP.duration,
    (t, reducedMotion) => {
      const group = ref.current;
      if (!group) return;
      const [y, stretch] =
        t === null || reducedMotion ? [0, 1] : hopPose(t, height);
      group.position.y = y;
      const squash = 1 / Math.sqrt(stretch);
      group.scale.set(squash, stretch, squash);
    },
  );
  return (
    <group position={position} {...bind}>
      <group ref={pose}>
        <group ref={ref}>{children}</group>
      </group>
      <HintOrb hint={hint} position={[0, hintHeight, 0]} />
    </group>
  );
}

export function Bench({ position }: { position: Vec3 }) {
  const length = 3.4;
  return (
    <Hop position={position} height={0.6} hintHeight={2.5}>
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
    </Hop>
  );
}

// Angles (radians) of the flowers around a planter's bush, unevenly spaced.
const PLANTER_FLOWERS = [0.3, 1.4, 2.3, 3.3, 4.2, 5.3];

export function Planter({
  position,
  size = 1,
}: {
  position: Vec3;
  size?: number;
}) {
  return (
    <Hop position={position} height={0.8} hintHeight={2.6 * size}>
      <group scale={size}>
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
          <meshStandardMaterial
            {...snowy}
            color={COLORS.bush}
            roughness={0.85}
          />
        </mesh>
        <mesh position={[0.35, 1.75, 0.3]} castShadow>
          <sphereGeometry args={[0.55, 14, 10]} />
          <meshStandardMaterial
            {...snowy}
            color={COLORS.bushLight}
            roughness={0.85}
          />
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
            <meshStandardMaterial
              {...snowy}
              color={FLOWER_COLORS[i % 3]}
              roughness={0.6}
            />
          </mesh>
        ))}
      </group>
    </Hop>
  );
}
