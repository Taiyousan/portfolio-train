import { useRef, type ReactNode, type RefObject } from "react";
import { RoundedBox } from "@react-three/drei";
import type { SpringValue } from "@react-spring/three";
import * as THREE from "three";
import useStationProp from "../hooks/useStationProp";
import {
  Block,
  Cylinder,
  FLOWER_COLORS,
  STATION_COLORS as COLORS,
  type Vec3,
} from "./StationPrimitives";

// The station's props (see StationDecor, which places them), each playing a
// little animation when clicked while the train waits: the clock spins its
// hands, a lamp blinks out, the bin tips over, the suitcase opens, the bench
// and planters hop. With reduced motion, movements jump straight to their
// end (or are left out when they are only a flourish). Same units as
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
  const bind = useStationProp(CLOCK_SPIN.duration, (t, reducedMotion) => {
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
          CLOCK_SPIN.shakeAngle * fade * Math.sin(t * CLOCK_SPIN.shakeSpeed);
      }
    }
    const [hour, minute] = handRefs.current;
    if (hour) hour.rotation.x = TAU * (hours / 12 + spin);
    if (minute) {
      minute.rotation.x = TAU * (minutes / 60 + CLOCK_SPIN.minuteTurns * spin);
    }
    if (bodyRef.current) bodyRef.current.rotation.x = shake;
  });

  return (
    <group position={position} {...bind}>
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
export function Lamp({
  position,
  pop,
}: {
  position: Vec3;
  pop: SpringValue<number>;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const lanternRef = useRef<THREE.MeshStandardMaterial>(null);
  const bind = useStationProp(LAMP_BLINK.duration, (t, reducedMotion) => {
    let level = 1;
    if (t !== null) {
      const steps = reducedMotion ? LAMP_BLINK.reduced : LAMP_BLINK.steps;
      for (const [at, value] of steps) if (t >= at) level = value;
    }
    const light = lightRef.current;
    if (light) {
      light.intensity = Math.max(pop.get(), 0) * LAMP_INTENSITY * level;
    }
    const lantern = lanternRef.current;
    if (lantern) {
      lantern.color.lerpColors(LANTERN_OFF, LANTERN_ON, level);
      lantern.emissiveIntensity = LAMP_GLOW * level;
    }
  });

  return (
    <group position={position} {...bind}>
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
            emissiveIntensity={LAMP_GLOW}
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
          <meshStandardMaterial color={COLORS.iron} />
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
  const bind = useStationProp(BIN_SPILL.duration, (t, jump) => {
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
            <meshStandardMaterial color={COLORS.iron} roughness={0.6} />
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
              <meshStandardMaterial color={COLORS.bin} roughness={0.7} />
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
  const bind = useStationProp(SUITCASE_OPEN.duration, (t, jump) => {
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
        const down = span(t, CONTENTS_JUMP.fallAt + delay, CONTENTS_JUMP.fall);
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
  });
  const { width, length, depth, lid, wall } = SUITCASE;

  return (
    <group position={position} {...bind}>
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
        {/* Hollow shell: lined floor, then four walls */}
        <Block
          size={[width, wall, length]}
          position={[0, wall / 2, 0]}
          radius={0.03}
          color={COLORS.lining}
        />
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
        <SuitcaseContents itemRefs={itemRefs} />
        {/* Lid, hinged along the back edge, lined inside */}
        <group ref={lidRef} position={[width / 2, depth, 0]}>
          <Block
            size={[width, lid, length]}
            position={[-width / 2, lid / 2, 0]}
            radius={0.05}
            color={COLORS.suitcase}
          />
          <Block
            size={[width - 2 * wall, 0.02, length - 2 * wall]}
            position={[-width / 2, 0, 0]}
            radius={0.005}
            color={COLORS.lining}
          />
        </group>
      </group>
    </group>
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
  children,
}: {
  position: Vec3;
  height: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const bind = useStationProp(HOP.duration, (t, reducedMotion) => {
    const group = ref.current;
    if (!group) return;
    const [y, stretch] =
      t === null || reducedMotion ? [0, 1] : hopPose(t, height);
    group.position.y = position[1] + y;
    const squash = 1 / Math.sqrt(stretch);
    group.scale.set(squash, stretch, squash);
  });
  return (
    <group ref={ref} position={position} {...bind}>
      {children}
    </group>
  );
}

export function Bench({ position }: { position: Vec3 }) {
  const length = 3.4;
  return (
    <Hop position={position} height={0.6}>
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
    <Hop position={position} height={0.8}>
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
            <meshStandardMaterial
              color={FLOWER_COLORS[i % 3]}
              roughness={0.6}
            />
          </mesh>
        ))}
      </group>
    </Hop>
  );
}
