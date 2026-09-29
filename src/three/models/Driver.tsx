import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Block, Cylinder, STATION_COLORS } from "./StationPrimitives";

// A small cartoon driver, rounded like the station (see StationPrimitives):
// standing in the locomotive cab, standing or sitting on the platform's edge
// while the train waits at the station, or at the desk at home, in a hoodie,
// typing. Curly hair, a short beard and a moustache. Built as a rig of
// nested groups (hips, knees, spine, shoulders, elbows, neck) posed every
// frame: breathing, blinking, glancing around,
// legs swinging over the platform's edge, and a wave on demand (see
// DriverHandle). Held still with reduced motion. In driver units: about
// 0.94 tall standing, cap included, facing +z.

const COLORS = {
  gold: STATION_COLORS.edge,
  shirt: STATION_COLORS.sign,
  tie: STATION_COLORS.roof,
  skin: "#e2b48c",
  nose: "#d99f78",
  eye: "#2a1d15",
  mouth: "#8a3b30",
  hair: "#33231a",
  beard: "#45322a",
  cap: "#2b3a5c",
  visor: "#1c1d24",
};

// The conductor's uniform, or the developer's hoodie, jeans and sneakers at
// home: `top` for the body and sleeves, `trim` for the cuffs (and the
// hoodie's pocket).
const OUTFITS = {
  uniform: {
    top: "#3d5a8a",
    trim: COLORS.gold,
    trousers: "#2b3a5c",
    shoes: STATION_COLORS.iron,
  },
  hoodie: {
    top: "#2f6f73",
    trim: "#275d61",
    trousers: "#4a6689",
    shoes: STATION_COLORS.sign,
  },
};
type Outfit = (typeof OUTFITS)[keyof typeof OUTFITS];

// Rig: legs from the hips down, then the spine's joints above the hips.
const HIP_X = 0.07;
const THIGH = 0.15;
const SHIN = 0.14;
// Ankle to sole.
const SOLE = 0.055;
const HIP_STANDING = THIGH + SHIN + SOLE;
// Sitting, the hips rest on the seat by the thighs' thickness.
const HIP_SITTING = 0.06;
const SHOULDER_X = 0.165;
const SHOULDER_Y = 0.24;
const UPPER_ARM = 0.14;
// Elbow to the hand's centre.
const FOREARM = 0.15;
const HAND_RADIUS = 0.045;
const NECK_Y = 0.29;
// Head centre above the neck joint.
const HEAD_Y = 0.12;
const HEAD_RADIUS = 0.14;

// Seat depth the thighs take up: place a sitting driver this far back from
// the ledge's edge (in driver units) so the knees just clear it and the
// shins hang free.
export const DRIVER_SEAT_DEPTH = THIGH - 0.055;
// Seat height that puts a sitting driver's feet on the floor, in driver
// units.
export const DRIVER_SEAT_HEIGHT = SHIN + SOLE - HIP_SITTING;

// Typing: leaning in a little, upper arms and forearms held out at these
// angles from hanging (radians, forward), the head tipped down to the
// screen, each forearm tapping in turn.
const TYPING = {
  lean: 0.15,
  upperArm: 0.6,
  forearm: 1.6,
  look: 0.3,
  tap: 0.08,
  tapSpeed: 14,
};
// Where the typing hands' centres land, from the seat (driver units, z
// forward): the keyboard goes just under them (see Home's desk).
export const DRIVER_TYPING_HANDS = {
  y:
    HIP_SITTING +
    SHOULDER_Y * Math.cos(TYPING.lean) -
    UPPER_ARM * Math.cos(TYPING.upperArm) -
    FOREARM * Math.cos(TYPING.forearm),
  z:
    SHOULDER_Y * Math.sin(TYPING.lean) +
    UPPER_ARM * Math.sin(TYPING.upperArm) +
    FOREARM * Math.sin(TYPING.forearm),
  radius: HAND_RADIUS,
};

// Idle motion, in seconds and radians: breathing, weight shifting from foot
// to foot standing, legs swinging sitting, blinks now and then (sometimes
// twice), and glances held a few seconds each, eased toward.
const IDLE = {
  breathSpeed: 2.1,
  breath: 0.018,
  shift: 0.025,
  shiftSpeed: 0.7,
  swing: 0.28,
  swingSpeed: 2.2,
  blink: 0.14,
  blinkGap: [2, 5.5],
  doubleBlink: 0.2,
  lookGap: [1.5, 4.5],
  lookYaw: 0.45,
  lookPitch: 0.08,
  lookEase: 4,
};

// Wave (right arm, on -x): raised in, waved about the elbow, lowered.
// Brows up and head tipped toward it. With reduced motion, the arm is
// just held up for the wave's length.
const WAVE = {
  raise: 0.3,
  hold: 1.5,
  lower: 0.35,
  arm: 2.6,
  forward: 0.3,
  bend: 0.5,
  sweep: 0.4,
  speed: 11,
  tilt: 0.1,
  brows: 0.012,
};
const WAVE_DURATION = WAVE.raise + WAVE.hold + WAVE.lower;

// Right (-x) then left (+x).
const SIDES = [-1, 1] as const;

const smoothstep = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};
const between = ([min, max]: number[]) => min + Math.random() * (max - min);

export type DriverHandle = {
  // Waves once (ignored while already waving).
  wave: () => void;
};

type Props = Omit<ThreeElements["group"], "ref"> & {
  ref?: Ref<DriverHandle>;
  // "standing": feet at the origin. "sitting": seat at the origin, facing
  // +z, legs dangling below it past z = DRIVER_SEAT_DEPTH.
  pose?: "standing" | "sitting";
  // The conductor's uniform and cap, or at home, where the driver is just
  // the developer, a hoodie, bareheaded.
  outfit?: keyof typeof OUTFITS;
  // Hands over a keyboard in front, tapping (see DRIVER_TYPING_HANDS).
  typing?: boolean;
};

type Rig = {
  hips: THREE.Group | null;
  spine: THREE.Group | null;
  chest: THREE.Group | null;
  head: THREE.Group | null;
  brows: THREE.Group | null;
  eyes: (THREE.Group | null)[];
  hipJoints: (THREE.Group | null)[];
  knees: (THREE.Group | null)[];
  shoulders: (THREE.Group | null)[];
  elbows: (THREE.Group | null)[];
};

export default function Driver({
  ref,
  pose = "standing",
  outfit = "uniform",
  typing = false,
  ...props
}: Props) {
  const sitting = pose === "sitting";
  const clothes = OUTFITS[outfit];
  const rig = useRef<Rig>({
    hips: null,
    spine: null,
    chest: null,
    head: null,
    brows: null,
    eyes: [],
    hipJoints: [],
    knees: [],
    shoulders: [],
    elbows: [],
  });
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  // Frame-clock state, set up on the first frame: an offset so two drivers
  // don't move in step, the next blink, the glance eased toward, the wave.
  const stateRef = useRef({
    seed: -1,
    blinkAt: 0,
    nextBlink: 0,
    nextLook: 0,
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    waveRequested: false,
    waveStart: null as number | null,
  });

  useImperativeHandle(
    ref,
    () => ({
      wave: () => {
        const state = stateRef.current;
        if (state.waveStart === null) state.waveRequested = true;
      },
    }),
    [],
  );

  useFrame(({ clock }, delta) => {
    const r = rig.current;
    const state = stateRef.current;
    const now = clock.elapsedTime;
    if (state.seed < 0) {
      state.seed = Math.random() * 100;
      state.nextBlink = now + between(IDLE.blinkGap);
    }
    // Idle time, frozen with reduced motion, and how much idle motion.
    const t = reducedMotion ? 0 : now + state.seed;
    const idle = reducedMotion ? 0 : 1;

    // Wave: 0 at rest, 1 with the arm up.
    if (state.waveRequested) {
      state.waveRequested = false;
      state.waveStart = now;
    }
    let wave = 0;
    let waveT = 0;
    if (state.waveStart !== null) {
      waveT = now - state.waveStart;
      if (waveT >= WAVE_DURATION) {
        state.waveStart = null;
      } else if (reducedMotion) {
        wave = 1;
      } else {
        wave =
          smoothstep(waveT / WAVE.raise) *
          (1 - smoothstep((waveT - WAVE.raise - WAVE.hold) / WAVE.lower));
      }
    }

    // Body: breathing swells the chest and lifts the shoulders and head,
    // standing shifts the weight (the hips tilt, the spine leans back
    // against it, the legs stay upright).
    const breath = idle * Math.sin(t * IDLE.breathSpeed);
    const lift = 1 + IDLE.breath * breath;
    const shift = sitting
      ? 0
      : idle * IDLE.shift * Math.sin(t * IDLE.shiftSpeed);
    const lean = typing ? TYPING.lean : sitting ? 0.06 : 0;
    r.hips?.position.set(0, sitting ? HIP_SITTING : HIP_STANDING, 0);
    r.hips?.rotation.set(0, 0, shift);
    r.spine?.rotation.set(lean + 0.01 * breath, 0, -1.4 * shift);
    r.chest?.scale.set(1 + 0.6 * IDLE.breath * breath, lift, 1);

    // Legs: straight standing; sitting, thighs forward and a little apart,
    // shins down, swinging forward in turn (never back into the ledge),
    // still under the desk.
    SIDES.forEach((side, i) => {
      r.hipJoints[i]?.rotation.set(
        sitting ? -Math.PI / 2 : 0,
        0,
        sitting ? side * 0.08 : -shift,
      );
      const swing =
        sitting && !typing
          ? idle *
            IDLE.swing *
            (0.5 + 0.5 * Math.sin(t * IDLE.swingSpeed + (i ? Math.PI : 0)))
          : 0;
      r.knees[i]?.rotation.set(sitting ? Math.PI / 2 - swing : 0, 0, 0);
    });

    // Arms: hanging a little out standing, hands on the thighs sitting,
    // over the keyboard typing; the right one waving on demand.
    SIDES.forEach((side, i) => {
      let sx: number;
      let sz: number;
      let ex: number;
      let ez = 0;
      if (typing) {
        // Out of step, and not quite in rhythm, like actual typing.
        const phase = t * TYPING.tapSpeed * (i ? 1.3 : 1) + (i ? 2 : 0);
        sx = -(TYPING.upperArm + lean);
        sz = -side * 0.12;
        ex =
          -(TYPING.forearm - TYPING.upperArm) -
          idle * TYPING.tap * Math.max(0, Math.sin(phase));
      } else if (sitting) {
        sx = -(0.5 + lean);
        sz = -side * 0.03;
        ex = -0.45;
      } else {
        // Relaxed, and not quite mirrored.
        sx = (i ? 0.02 : 0.08) + idle * 0.03 * Math.sin(t * 1.1 + i);
        sz = side * (i ? 0.14 : 0.1);
        ex = i ? -0.3 : -0.42;
      }
      if (i === 0 && wave > 0) {
        const sweep = reducedMotion
          ? 0
          : WAVE.sweep * Math.sin((waveT - WAVE.raise) * WAVE.speed);
        sx = THREE.MathUtils.lerp(sx, WAVE.forward, wave);
        sz = THREE.MathUtils.lerp(sz, side * WAVE.arm, wave);
        ex = THREE.MathUtils.lerp(ex, 0, wave);
        ez = wave * side * (WAVE.bend + sweep);
      }
      r.shoulders[i]?.position.set(side * SHOULDER_X, SHOULDER_Y * lift, 0);
      r.shoulders[i]?.rotation.set(sx, 0, sz);
      r.elbows[i]?.rotation.set(ex, 0, ez);
    });

    // Head: a new glance every few seconds, eased toward (down at the
    // screen typing), kept level against the lean.
    if (!reducedMotion && now >= state.nextLook) {
      state.nextLook = now + between(IDLE.lookGap);
      const range = typing ? 0.25 : 1;
      state.targetYaw = (Math.random() * 2 - 1) * IDLE.lookYaw * range;
      state.targetPitch = (Math.random() * 2 - 1) * IDLE.lookPitch * range;
    }
    const ease = 1 - Math.exp(-IDLE.lookEase * delta);
    state.yaw += (state.targetYaw - state.yaw) * ease;
    state.pitch += (state.targetPitch - state.pitch) * ease;
    r.head?.position.set(0, NECK_Y * lift, 0);
    r.head?.rotation.set(
      state.pitch - lean + (typing ? TYPING.look : 0),
      state.yaw * (1 - wave),
      1.4 * shift + WAVE.tilt * wave,
    );
    r.brows?.position.set(0, WAVE.brows * wave, 0);

    // Blinks: the eyes squash shut and open again.
    let open = 1;
    if (!reducedMotion) {
      if (now >= state.nextBlink) {
        state.blinkAt = now;
        state.nextBlink =
          now +
          (Math.random() < IDLE.doubleBlink ? 0.3 : between(IDLE.blinkGap));
      }
      const b = (now - state.blinkAt) / IDLE.blink;
      if (b >= 0 && b < 1) open = 1 - 0.9 * Math.sin(Math.PI * b);
    }
    r.eyes.forEach((eye) => eye?.scale.set(1, open, 1));
  });

  return (
    <group {...props}>
      <group
        ref={(g) => {
          rig.current.hips = g;
        }}
        position={[0, sitting ? HIP_SITTING : HIP_STANDING, 0]}
      >
        {/* Pelvis, under the jacket's hem */}
        <Block
          size={[0.25, 0.11, 0.18]}
          position={[0, 0.005, 0]}
          radius={0.05}
          color={clothes.trousers}
        />
        {SIDES.map((side, i) => (
          <Leg
            key={side}
            side={side}
            clothes={clothes}
            hipRef={(g) => {
              rig.current.hipJoints[i] = g;
            }}
            kneeRef={(g) => {
              rig.current.knees[i] = g;
            }}
          />
        ))}

        <group
          ref={(g) => {
            rig.current.spine = g;
          }}
        >
          <group
            ref={(g) => {
              rig.current.chest = g;
            }}
          >
            {outfit === "hoodie" ? (
              <Hoodie color={clothes.top} trim={clothes.trim} />
            ) : (
              <Uniform color={clothes.top} />
            )}
          </group>
          {SIDES.map((side, i) => (
            <Arm
              key={side}
              side={side}
              clothes={clothes}
              ribbed={outfit === "hoodie"}
              shoulderRef={(g) => {
                rig.current.shoulders[i] = g;
              }}
              elbowRef={(g) => {
                rig.current.elbows[i] = g;
              }}
            />
          ))}
          <group
            ref={(g) => {
              rig.current.head = g;
            }}
            position={[0, NECK_Y, 0]}
          >
            <Cylinder
              radius={0.045}
              height={0.07}
              position={[0, 0.01, 0]}
              color={COLORS.skin}
            />
            <Head
              cap={outfit === "uniform"}
              eyeRef={(i, g) => {
                rig.current.eyes[i] = g;
              }}
              browsRef={(g) => {
                rig.current.brows = g;
              }}
            />
          </group>
        </group>
      </group>
    </group>
  );
}

type GroupRef = (group: THREE.Group | null) => void;

function Leg({
  side,
  clothes,
  hipRef,
  kneeRef,
}: {
  side: number;
  clothes: Outfit;
  hipRef: GroupRef;
  kneeRef: GroupRef;
}) {
  return (
    <group ref={hipRef} position={[side * HIP_X, 0, 0]}>
      <mesh castShadow position={[0, -THIGH / 2, 0]}>
        <capsuleGeometry args={[0.058, THIGH, 4, 12]} />
        <meshStandardMaterial color={clothes.trousers} roughness={0.8} />
      </mesh>
      <group ref={kneeRef} position={[0, -THIGH, 0]}>
        <mesh castShadow position={[0, -SHIN / 2, 0]}>
          <capsuleGeometry args={[0.052, SHIN, 4, 12]} />
          <meshStandardMaterial color={clothes.trousers} roughness={0.8} />
        </mesh>
        {/* Shoe, its toe out front */}
        <Block
          size={[0.1, 0.07, 0.16]}
          position={[0, -SHIN - SOLE + 0.035, 0.03]}
          radius={0.03}
          color={clothes.shoes}
        />
      </group>
    </group>
  );
}

// Body, from the hips up to the shoulders (see Uniform and Hoodie).
function Body({ color }: { color: string }) {
  return (
    <Block
      size={[0.29, 0.3, 0.2]}
      position={[0, 0.135, 0]}
      radius={0.09}
      color={color}
    />
  );
}

// Uniform jacket with a flared hem, shirt collar, tie and a row of gold
// buttons.
function Uniform({ color }: { color: string }) {
  return (
    <>
      <Body color={color} />
      <Block
        size={[0.305, 0.07, 0.215]}
        position={[0, 0.02, 0]}
        radius={0.03}
        color={color}
      />
      {/* Collar points, in a V around the tie's knot */}
      {SIDES.map((side) => (
        <Block
          key={side}
          size={[0.055, 0.032, 0.02]}
          position={[side * 0.03, 0.262, 0.088]}
          rotation={[0, 0, side * 0.55]}
          radius={0.009}
          color={COLORS.shirt}
        />
      ))}
      <Block
        size={[0.032, 0.026, 0.022]}
        position={[0, 0.25, 0.095]}
        radius={0.009}
        color={COLORS.tie}
      />
      <Block
        size={[0.04, 0.085, 0.016]}
        position={[0, 0.19, 0.103]}
        rotation={[0.08, 0, 0]}
        radius={0.007}
        color={COLORS.tie}
      />
      {[0.12, 0.065].map((y) => (
        <mesh key={y} position={[0, y, 0.1]}>
          <sphereGeometry args={[0.014, 8, 6]} />
          <meshStandardMaterial
            color={COLORS.gold}
            metalness={0.5}
            roughness={0.35}
          />
        </mesh>
      ))}
    </>
  );
}

// Hoodie with a ribbed hem, a kangaroo pocket, its hood down in a roll
// around the neck and bunched on the back, and drawstrings.
function Hoodie({ color, trim }: { color: string; trim: string }) {
  return (
    <>
      <Body color={color} />
      <Block
        size={[0.3, 0.05, 0.21]}
        position={[0, 0.005, 0]}
        radius={0.022}
        color={trim}
      />
      <Block
        size={[0.17, 0.08, 0.02]}
        position={[0, 0.07, 0.098]}
        radius={0.015}
        color={trim}
      />
      <mesh
        castShadow
        position={[0, 0.275, -0.015]}
        rotation-x={Math.PI / 2 + 0.2}
      >
        <torusGeometry args={[0.075, 0.035, 10, 24]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.215, -0.1]} scale={[1.3, 1, 0.55]}>
        <sphereGeometry args={[0.075, 14, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {SIDES.map((side) => (
        <Cylinder
          key={side}
          radius={0.005}
          height={0.07}
          position={[side * 0.028, 0.215, 0.102]}
          color={COLORS.shirt}
          segments={6}
        />
      ))}
    </>
  );
}

// Shoulder to hand, hanging down (-y) at rest: a gold stripe at the cuff
// of the uniform, a ribbed cuff on the hoodie.
function Arm({
  side,
  clothes,
  ribbed,
  shoulderRef,
  elbowRef,
}: {
  side: number;
  clothes: Outfit;
  ribbed: boolean;
  shoulderRef: GroupRef;
  elbowRef: GroupRef;
}) {
  return (
    <group ref={shoulderRef} position={[side * SHOULDER_X, SHOULDER_Y, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.056, 12, 10]} />
        <meshStandardMaterial color={clothes.top} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, -UPPER_ARM / 2, 0]}>
        <capsuleGeometry args={[0.045, UPPER_ARM, 4, 10]} />
        <meshStandardMaterial color={clothes.top} roughness={0.75} />
      </mesh>
      <group ref={elbowRef} position={[0, -UPPER_ARM, 0]}>
        <mesh castShadow position={[0, -(FOREARM - 0.05) / 2, 0]}>
          <capsuleGeometry args={[0.041, FOREARM - 0.05, 4, 10]} />
          <meshStandardMaterial color={clothes.top} roughness={0.75} />
        </mesh>
        <Cylinder
          radius={ribbed ? 0.043 : 0.044}
          height={ribbed ? 0.03 : 0.014}
          position={[0, -(FOREARM - (ribbed ? 0.085 : 0.075)), 0]}
          color={clothes.trim}
        />
        <mesh castShadow position={[0, -FOREARM, 0]} scale={[0.9, 1, 1]}>
          <sphereGeometry args={[HAND_RADIUS, 12, 10]} />
          <meshStandardMaterial color={COLORS.skin} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// Curly hair: small balls over the head, merged into one geometry, on a
// Fibonacci lattice (points spread evenly over a sphere) filtered to the
// hair's area. The hair's dark base
// is a cap of sphere tipped back by HAIR_TILT, HAIR_RIM from its pole.
const HAIR_TILT = 0.6;
const HAIR_RIM = 1.5;
const HAIR_POLE = new THREE.Vector3(
  0,
  Math.cos(HAIR_TILT),
  -Math.sin(HAIR_TILT),
);

// A repeatable pseudo-random value in [0, 1) for each lattice point.
const jitter = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// Hair and beard geometries, built once per kind and shared by every
// driver (never disposed, hence the meshes' dispose={null}).
const geometryCache = new Map<string, THREE.BufferGeometry>();

// `place` gives a lattice point's ball radius and its distance from the
// head's centre, or null to leave it out.
function curls(
  key: string,
  count: number,
  place: (p: THREE.Vector3, i: number) => [number, number] | null,
) {
  let geometry = geometryCache.get(key);
  if (!geometry) {
    const balls: THREE.BufferGeometry[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * (i + 0.5)) / count;
      const r = Math.sqrt(1 - y * y);
      const p = new THREE.Vector3(
        Math.cos(golden * i) * r,
        y,
        Math.sin(golden * i) * r,
      );
      const spot = place(p, i);
      if (!spot) continue;
      const [radius, distance] = spot;
      const ball = new THREE.IcosahedronGeometry(radius, 1);
      ball.translate(p.x * distance, p.y * distance, p.z * distance);
      balls.push(ball);
    }
    geometry = mergeGeometries(balls) ?? new THREE.BufferGeometry();
    balls.forEach((ball) => ball.dispose());
    geometryCache.set(key, geometry);
  }
  return geometry;
}

// Hair: over the scalp, tipped back off the forehead, and down the temples
// to the sideburns. Under the cap, only the curls poking out below it;
// bareheaded, fuller on top.
function hairCurls(cap: boolean) {
  return curls(cap ? "hair-cap" : "hair", 220, (p, i) => {
    const scalp = p.dot(HAIR_POLE) > Math.cos(HAIR_RIM - 0.05);
    const temple = Math.abs(p.x) > 0.75 && p.z < 0.5 && p.y > 0;
    if (!scalp && !temple) return null;
    if (cap && p.y > 0.5) return null;
    return [
      (cap ? 0.022 : 0.026) + 0.008 * jitter(i),
      HEAD_RADIUS + 0.008 + (cap ? 0 : 0.016 * Math.max(0, p.y)),
    ];
  });
}

// Short beard: a thin shell over the face (the triangles of a sphere just
// larger than the head whose centre is in its area), trimmed to the jaw,
// the chin and the sideburns in front of the ears, leaving the mouth and
// the upper cheeks clear. `p` is a direction from the head's centre.
function inBeard(p: THREE.Vector3) {
  if (p.y > Math.min(0.05, -0.62 + 0.75 * p.x * p.x)) return false;
  return p.z > (p.y > -0.4 ? 0.12 : -0.3);
}

function beardShell() {
  let geometry = geometryCache.get("beard");
  if (!geometry) {
    const sphere = new THREE.SphereGeometry(
      HEAD_RADIUS + 0.004,
      // Fine enough for the trimmed edge not to show its steps.
      192,
      128,
    ).toNonIndexed();
    const position = sphere.getAttribute("position");
    const normal = sphere.getAttribute("normal");
    const positions: number[] = [];
    const normals: number[] = [];
    const centre = new THREE.Vector3();
    const corner = new THREE.Vector3();
    for (let t = 0; t < position.count; t += 3) {
      centre.set(0, 0, 0);
      for (let k = 0; k < 3; k++) {
        centre.add(corner.fromBufferAttribute(position, t + k));
      }
      if (!inBeard(centre.normalize())) continue;
      for (let k = t; k < t + 3; k++) {
        positions.push(position.getX(k), position.getY(k), position.getZ(k));
        normals.push(normal.getX(k), normal.getY(k), normal.getZ(k));
      }
    }
    sphere.dispose();
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometryCache.set("beard", geometry);
  }
  return geometry;
}

// Round head, centred HEAD_Y above the neck joint: dot eyes with a
// highlight, brows, button nose, a thin moustache, a smile above a short
// beard, ears, and curly hair over a dark base tipped back off the face.
// Topped with the conductor's cap (crown, dark band with a gold stripe,
// badge, glossy visor), worn a little askew.
function Head({
  cap,
  eyeRef,
  browsRef,
}: {
  cap: boolean;
  eyeRef: (i: number, group: THREE.Group | null) => void;
  browsRef: GroupRef;
}) {
  return (
    <group position={[0, HEAD_Y, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[HEAD_RADIUS, 24, 18]} />
        <meshStandardMaterial color={COLORS.skin} roughness={0.9} />
      </mesh>
      {SIDES.map((side, i) => (
        <group key={side}>
          {/* ear */}
          <mesh position={[side * 0.136, 0, 0]} scale={[0.6, 1, 1]}>
            <sphereGeometry args={[0.032, 10, 8]} />
            <meshStandardMaterial color={COLORS.skin} roughness={0.9} />
          </mesh>
          {/* eye, squashed shut on a blink */}
          <group
            ref={(g) => eyeRef(i, g)}
            position={[side * 0.05, 0.015, 0.124]}
          >
            <mesh scale={[1, 1.35, 0.6]}>
              <sphereGeometry args={[0.021, 12, 10]} />
              <meshStandardMaterial color={COLORS.eye} roughness={0.3} />
            </mesh>
            <mesh position={[0.007, 0.01, 0.011]}>
              <sphereGeometry args={[0.006, 6, 4]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
          {/* moustache half, following the upper lip */}
          <mesh
            position={[side * 0.02, -0.047, 0.128]}
            rotation={[0, 0, -side * 0.12]}
            scale={[1.25, 0.5, 0.6]}
          >
            <sphereGeometry args={[0.02, 12, 8]} />
            <meshStandardMaterial color={COLORS.beard} roughness={0.95} />
          </mesh>
        </group>
      ))}
      <group ref={browsRef}>
        {SIDES.map((side) => (
          <Block
            key={side}
            size={[0.05, 0.016, 0.02]}
            position={[side * 0.052, 0.058, 0.112]}
            rotation={[0, 0, -side * 0.12]}
            radius={0.007}
            color={COLORS.hair}
          />
        ))}
      </group>
      <mesh position={[0, -0.015, 0.138]}>
        <sphereGeometry args={[0.024, 12, 10]} />
        <meshStandardMaterial color={COLORS.nose} roughness={0.9} />
      </mesh>
      {/* smile: half a torus, turned down, tipped to follow the face */}
      <mesh position={[0, -0.066, 0.127]} rotation={[0.5, 0, Math.PI]}>
        <torusGeometry args={[0.019, 0.006, 6, 14, Math.PI]} />
        <meshStandardMaterial color={COLORS.mouth} roughness={0.8} />
      </mesh>
      <mesh geometry={beardShell()} dispose={null}>
        <meshStandardMaterial color={COLORS.beard} roughness={0.95} />
      </mesh>
      {/* hair: a dark base, the curls over it */}
      <mesh castShadow rotation={[-HAIR_TILT, 0, 0]}>
        <sphereGeometry
          args={[HEAD_RADIUS + 0.007, 24, 12, 0, Math.PI * 2, 0, HAIR_RIM]}
        />
        <meshStandardMaterial color={COLORS.hair} roughness={0.9} />
      </mesh>
      <mesh castShadow geometry={hairCurls(cap)} dispose={null}>
        <meshStandardMaterial color={COLORS.hair} roughness={0.95} />
      </mesh>

      {cap && (
        <group rotation={[-0.05, 0, 0.08]}>
          <Cylinder
            radius={0.143}
            top={0.158}
            height={0.1}
            position={[0, 0.13, 0]}
            color={COLORS.cap}
            segments={24}
          />
          <Cylinder
            radius={0.146}
            height={0.032}
            position={[0, 0.097, 0]}
            color={COLORS.visor}
            segments={24}
          />
          <Cylinder
            radius={0.148}
            height={0.008}
            position={[0, 0.117, 0]}
            color={COLORS.gold}
            segments={24}
          />
          <Block
            size={[0.045, 0.035, 0.02]}
            position={[0, 0.14, 0.152]}
            radius={0.008}
            color={COLORS.gold}
          />
          {/* visor: a half disc out front, tipped down */}
          <mesh
            castShadow
            position={[0, 0.085, 0.075]}
            rotation={[0.2, 0, 0]}
            scale={[1, 1, 0.85]}
          >
            <cylinderGeometry
              args={[0.11, 0.11, 0.014, 20, 1, false, -Math.PI / 2, Math.PI]}
            />
            <meshStandardMaterial color={COLORS.visor} roughness={0.35} />
          </mesh>
        </group>
      )}
    </group>
  );
}
