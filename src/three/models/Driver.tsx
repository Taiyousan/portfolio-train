import { useImperativeHandle, useRef, type Ref } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Block, Cylinder, NoSnow, STATION_COLORS } from "./StationPrimitives";
import { DEFAULT_OUTFIT, shade, type Outfit } from "../config/livery";
import useReducedMotion from "../hooks/useReducedMotion";

// A small cartoon driver: in the cab, on the platform, or at the desk at
// home, dressed as picked in the workshop. A rig of nested groups (hips,
// knees, spine, shoulders, elbows, neck) posed every frame: breathing,
// blinking, glancing around, and a wave or a look at the camera on demand
// (see DriverHandle). Standing, it can also lean on a ledge (see LEANING).
// Held still with reduced motion. In driver units: about 0.94 tall, facing
// +z.

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
  visor: "#1c1d24",
  neckerchief: STATION_COLORS.roof,
};

// What an outfit dresses the rig in: `top` for the body and sleeves, `trim`
// for the cuffs (and the hoodie's pocket), `trousers` for the legs (and
// the overalls' bib, and the caps); shoes going with the style.
type Clothes = { top: string; trim: string; trousers: string; shoes: string };

function dress({ style, top, bottom }: Outfit): Clothes {
  return {
    top,
    trim: style === "uniform" ? COLORS.gold : shade(top, 0.85),
    trousers: bottom,
    shoes:
      style === "uniform"
        ? STATION_COLORS.iron
        : style === "overalls"
          ? STATION_COLORS.darkWood
          : STATION_COLORS.sign,
  };
}

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
// Standing, soles to the cap's top.
export const DRIVER_HEIGHT = 0.94;

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

// Leaning on a ledge (the cab's sill, in the workshop), dreamy: elbows on
// it, the chin on the right fist, gazing up and off with heavy lids. Worked
// out for a ledge `sill` above the feet whose edge is `edge` ahead of them
// (driver units), the spine bent by `lean`: shoulders (x, y, z) then elbows
// (x, z), right arm then left, and the head's pitch, turn and tilt. Eased
// in and out over `ease` seconds, the arms going over the ledge rather than
// through it: stepping `back` from it (fully by `backAt` of the way), they
// fold across the chest by `fold.at`, then the body steps in and sets them
// down, bending over it from `bendFrom` of the way.
const LEANING = {
  sill: 0.538,
  edge: 0.2,
  lean: 0.45,
  arms: [
    [-1.74, 1, -0.5, -2.13, 0.16],
    [-1.67, -1.04, 0.57, -1.39, -0.49],
  ],
  fold: {
    at: 0.5,
    arms: [
      [-1.67, 1.04, -0.57, -1.39, 0.49],
      [-1.67, -1.04, 0.57, -1.39, -0.49],
    ],
  },
  back: 0.15,
  backAt: 0.35,
  bendFrom: 0.3,
  look: [-0.25, -0.85, 0.3],
  lids: 0.85,
  brows: 0.006,
  breath: 2,
  sway: 0.035,
  swaySpeed: 0.6,
  ease: 1.2,
};
// The ledge the leaning pose fits, in driver units: its top's height above
// the feet and its edge's distance ahead of them.
export const DRIVER_LEANING_LEDGE = {
  height: LEANING.sill,
  edge: LEANING.edge,
};

// Propped against something behind (the board's edge), passing the time:
// tilted back about the feet by `tilt`, the weight on the left leg (the
// hips down by `drop`), the right toe tapping now and then, the hands in
// the pockets, the shoulders slumped (`spine`), the head pushed forward by
// `neck` (or its curls would go through what it leans on), glancing around
// more widely (`look`). Hip joints (x, z) and knees (x), then shoulders
// (x, y, z) and elbows (x, z), right then left.
const PROPPED = {
  tilt: 0.12,
  drop: 0.006,
  spine: -0.04,
  neck: 0.06,
  legs: [
    [-0.3, 0.08, 0.6],
    [-0.15, -0.03, 0.27],
  ],
  arms: [
    [0.6, 0.14, -0.58, -1.5, 0.64],
    [0.6, -0.14, 0.58, -1.5, -0.64],
  ],
  // Toe tapping: lifted this much (radians at the hip), this fast, in
  // bursts every so often.
  tap: 0.12,
  tapSpeed: 9,
  tapBursts: 0.5,
  look: 1.5,
};
// Where the back rests (from its point between the shoulder blades), in
// driver units: this far behind the feet, this high.
const BACK_POINT = { y: 0.2, depth: 0.1 };
export const DRIVER_PROPPED_BACK = {
  behind:
    (HIP_STANDING + BACK_POINT.y) * Math.sin(PROPPED.tilt) +
    BACK_POINT.depth * Math.cos(PROPPED.tilt),
  height:
    (HIP_STANDING + BACK_POINT.y) * Math.cos(PROPPED.tilt) -
    BACK_POINT.depth * Math.sin(PROPPED.tilt) -
    PROPPED.drop,
};

// Idle motion, in seconds and radians: breathing, weight shifting
// standing, legs swinging sitting, blinks (sometimes twice), and glances.
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

// Wave (right arm, on -x): raised, waved about the elbow, lowered, brows
// up. With reduced motion, the arm is just held up meanwhile.
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

// Look at the camera (seconds and radians): the head turns to it, the
// shoulders a little (`spine`, their share), up to `maxYaw` and
// `maxPitch`, holds a moment and turns back; typing pauses meanwhile.
const GLANCE = {
  turn: 0.3,
  hold: 1.1,
  back: 0.4,
  maxYaw: 1.4,
  maxPitch: 0.5,
  spine: 0.3,
  brows: 0.008,
};
const GLANCE_DURATION = GLANCE.turn + GLANCE.hold + GLANCE.back;
// The head's centre above the hips (the spine's origin), in driver units.
const HEAD_HEIGHT = NECK_Y + HEAD_Y;
// Scratch vector for the camera's position.
const toCamera = new THREE.Vector3();

const HALF_PI = Math.PI / 2;

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
  // Looks at the camera a moment (ignored while already looking).
  glance: () => void;
};

type Props = Omit<ThreeElements["group"], "ref"> & {
  ref?: Ref<DriverHandle>;
  // "standing": feet at the origin. "sitting": seat at the origin, facing
  // +z, legs dangling below it past z = DRIVER_SEAT_DEPTH. "propped": feet
  // at the origin, leaning back against something DRIVER_PROPPED_BACK
  // behind them (see PROPPED).
  pose?: "standing" | "sitting" | "propped";
  // The conductor's uniform and cap by default.
  outfit?: Outfit;
  // Hands over a keyboard in front, tapping (see DRIVER_TYPING_HANDS).
  typing?: boolean;
  // Standing only: leaning on a ledge in front (see LEANING and
  // DRIVER_LEANING_LEDGE), eased into and out of.
  leaning?: boolean;
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
  outfit = DEFAULT_OUTFIT,
  typing = false,
  leaning = false,
  ...props
}: Props) {
  const sitting = pose === "sitting";
  const propped = pose === "propped";
  const clothes = dress(outfit);
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
  const reducedMotion = useReducedMotion();
  // Frame-clock state, set up on the first frame (`seed` keeps two drivers
  // out of step).
  const stateRef = useRef({
    seed: -1,
    leaning: 0,
    blinkAt: 0,
    nextBlink: 0,
    nextLook: 0,
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    waveRequested: false,
    waveStart: null as number | null,
    glanceRequested: false,
    glanceStart: null as number | null,
  });

  useImperativeHandle(
    ref,
    () => ({
      wave: () => {
        const state = stateRef.current;
        if (state.waveStart === null) state.waveRequested = true;
      },
      glance: () => {
        const state = stateRef.current;
        if (state.glanceStart === null) state.glanceRequested = true;
      },
    }),
    [],
  );

  useFrame(({ clock, camera }, delta) => {
    const r = rig.current;
    const state = stateRef.current;
    const now = clock.elapsedTime;
    const leaningTarget = leaning && pose === "standing" ? 1 : 0;
    if (state.seed < 0) {
      state.seed = Math.random() * 100;
      state.nextBlink = now + between(IDLE.blinkGap);
      state.leaning = leaningTarget;
    }
    // Idle time, frozen with reduced motion, and how much idle motion.
    const t = reducedMotion ? 0 : now + state.seed;
    const idle = reducedMotion ? 0 : 1;

    // Leaning: 0 upright, 1 on the ledge, at a steady pace, eased at both
    // ends.
    state.leaning = reducedMotion
      ? leaningTarget
      : state.leaning +
        THREE.MathUtils.clamp(
          leaningTarget - state.leaning,
          -delta / LEANING.ease,
          delta / LEANING.ease,
        );
    const lean = smoothstep(state.leaning);
    // Idle glances around, kept small leaning (the chin stays on the fist).
    const looking = 1 - 0.8 * lean;

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

    // Look at the camera: 0 at rest, 1 turned to it.
    if (state.glanceRequested) {
      state.glanceRequested = false;
      state.glanceStart = now;
    }
    let glance = 0;
    if (state.glanceStart !== null) {
      const since = now - state.glanceStart;
      if (since >= GLANCE_DURATION) {
        state.glanceStart = null;
      } else if (reducedMotion) {
        glance = 1;
      } else {
        glance =
          smoothstep(since / GLANCE.turn) *
          (1 - smoothstep((since - GLANCE.turn - GLANCE.hold) / GLANCE.back));
      }
    }
    // The camera's direction from the head, in the hips' frame: the turn
    // about y, then the tip about x (+ down).
    let glanceYaw = 0;
    let glancePitch = 0;
    if (glance > 0 && r.hips) {
      r.hips.worldToLocal(toCamera.copy(camera.position));
      toCamera.y -= HEAD_HEIGHT;
      glanceYaw = THREE.MathUtils.clamp(
        Math.atan2(toCamera.x, toCamera.z),
        -GLANCE.maxYaw,
        GLANCE.maxYaw,
      );
      glancePitch = THREE.MathUtils.clamp(
        -Math.atan2(toCamera.y, Math.hypot(toCamera.x, toCamera.z)),
        -GLANCE.maxPitch,
        GLANCE.maxPitch,
      );
    }

    // Body: breathing swells the chest and lifts the shoulders and head;
    // standing, the weight shifts from foot to foot.
    const breath =
      idle *
      THREE.MathUtils.lerp(1, LEANING.breath, lean) *
      Math.sin(t * IDLE.breathSpeed);
    const lift = 1 + IDLE.breath * breath;
    const shift =
      sitting || propped
        ? 0
        : idle * IDLE.shift * Math.sin(t * IDLE.shiftSpeed) * (1 - lean);
    // Leaning: stood back from the ledge until the arms are folded over
    // it, bending over it on the way (see LEANING).
    const { fold } = LEANING;
    const way = state.leaning;
    const bend = THREE.MathUtils.lerp(
      typing ? TYPING.lean : sitting ? 0.06 : propped ? PROPPED.spine : 0,
      LEANING.lean,
      smoothstep((way - LEANING.bendFrom) / (1 - LEANING.bendFrom)),
    );
    const back =
      LEANING.back *
      smoothstep(way / LEANING.backAt) *
      (1 - smoothstep((way - fold.at) / (1 - fold.at)));
    // Propped: the whole body tilted back about the feet.
    const tilt = propped ? PROPPED.tilt : 0;
    if (propped) {
      r.hips?.position.set(
        0,
        HIP_STANDING * Math.cos(tilt) - PROPPED.drop,
        -HIP_STANDING * Math.sin(tilt),
      );
    } else {
      r.hips?.position.set(0, sitting ? HIP_SITTING : HIP_STANDING, -back);
    }
    r.hips?.rotation.set(-tilt, 0, shift);
    r.spine?.rotation.set(
      bend + 0.01 * breath,
      GLANCE.spine * glanceYaw * glance,
      -1.4 * shift,
    );
    r.chest?.scale.set(1 + 0.6 * IDLE.breath * breath, lift, 1);

    // Legs: straight standing; sitting, swinging in turn (still under the
    // desk); propped, the right toe tapping in bursts.
    const tapping = smoothstep((Math.sin(t * PROPPED.tapBursts) - 0.3) / 0.4);
    const tap =
      idle *
      PROPPED.tap *
      tapping *
      Math.max(0, Math.sin(t * PROPPED.tapSpeed));
    SIDES.forEach((side, i) => {
      if (propped) {
        const [thigh, out, knee] = PROPPED.legs[i];
        const lift = i === 0 ? tap : 0;
        r.hipJoints[i]?.rotation.set(thigh - lift, 0, out);
        r.knees[i]?.rotation.set(knee + lift, 0, 0);
        return;
      }
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

    // Arms: hanging standing, on the thighs sitting, over the keyboard
    // typing, folded on the ledge leaning; the right one waving on demand.
    SIDES.forEach((side, i) => {
      let sx: number;
      let sy = 0;
      let sz: number;
      let ex: number;
      let ez = 0;
      if (typing) {
        // Out of step, and not quite in rhythm, like actual typing.
        const phase = t * TYPING.tapSpeed * (i ? 1.3 : 1) + (i ? 2 : 0);
        sx = -(TYPING.upperArm + bend);
        sz = -side * 0.12;
        ex =
          -(TYPING.forearm - TYPING.upperArm) -
          idle * TYPING.tap * Math.max(0, Math.sin(phase)) * (1 - glance);
      } else if (sitting) {
        sx = -(0.5 + bend);
        sz = -side * 0.03;
        ex = -0.45;
      } else if (propped) {
        [sx, sy, sz, ex, ez] = PROPPED.arms[i];
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
      // Leaning: from wherever they are, folded across the chest, then
      // set down on the ledge.
      if (way > 0) {
        const [from, to, progress] =
          way < fold.at
            ? [[sx, sy, sz, ex, ez], fold.arms[i], way / fold.at]
            : [fold.arms[i], LEANING.arms[i], (way - fold.at) / (1 - fold.at)];
        const step = smoothstep(progress);
        [sx, sy, sz, ex, ez] = from.map((angle, k) =>
          THREE.MathUtils.lerp(angle, to[k], step),
        );
      }
      r.shoulders[i]?.position.set(side * SHOULDER_X, SHOULDER_Y * lift, 0);
      r.shoulders[i]?.rotation.set(sx, sy, sz);
      r.elbows[i]?.rotation.set(ex, 0, ez);
    });

    // Head: a new glance every few seconds (down at the screen typing), kept
    // level against the spine's bend; set dreamily and swaying leaning.
    if (!reducedMotion && now >= state.nextLook) {
      state.nextLook = now + between(IDLE.lookGap);
      const range = typing ? 0.25 : propped ? PROPPED.look : 1;
      state.targetYaw = (Math.random() * 2 - 1) * IDLE.lookYaw * range;
      state.targetPitch = (Math.random() * 2 - 1) * IDLE.lookPitch * range;
    }
    const ease = 1 - Math.exp(-IDLE.lookEase * delta);
    state.yaw += (state.targetYaw - state.yaw) * ease;
    state.pitch += (state.targetPitch - state.pitch) * ease;
    // Turned to the camera about y last ("YXZ"), so it tips toward it
    // rather than rolling.
    const [lookPitch, lookYaw, lookTilt] = LEANING.look;
    const sway = idle * LEANING.sway * Math.sin(t * LEANING.swaySpeed);
    r.head?.position.set(0, NECK_Y * lift, propped ? PROPPED.neck : 0);
    r.head?.rotation.set(
      THREE.MathUtils.lerp(
        state.pitch * looking -
          bend +
          tilt +
          (typing ? TYPING.look : 0) +
          lookPitch * lean,
        glancePitch - bend,
        glance,
      ),
      THREE.MathUtils.lerp(
        state.yaw * looking * (1 - wave) + lookYaw * lean,
        glanceYaw * (1 - GLANCE.spine),
        glance,
      ),
      (1.4 * shift + WAVE.tilt * wave + (lookTilt + sway) * lean) *
        (1 - glance),
      "YXZ",
    );
    r.brows?.position.set(
      0,
      WAVE.brows * wave + GLANCE.brows * glance + LEANING.brows * lean,
      0,
    );

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
    // Heavy-lidded leaning.
    open *= THREE.MathUtils.lerp(1, LEANING.lids, lean);
    r.eyes.forEach((eye) => eye?.scale.set(1, open, 1));
  });

  return (
    <NoSnow>
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
              {outfit.style === "hoodie" ? (
                <Hoodie color={clothes.top} trim={clothes.trim} />
              ) : outfit.style === "overalls" ? (
                <Overalls shirt={clothes.top} denim={clothes.trousers} />
              ) : (
                <Uniform color={clothes.top} />
              )}
            </group>
            {SIDES.map((side, i) => (
              <Arm
                key={side}
                side={side}
                clothes={clothes}
                ribbed={outfit.style !== "uniform"}
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
                hat={HATS[outfit.style]}
                hatColor={clothes.trousers}
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
    </NoSnow>
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
  clothes: Clothes;
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

// Body, from the hips up to the shoulders.
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

// Overalls over a shirt: the bib up the chest, held by straps curving over
// the shoulders from brass buttons, a pocket on it, and a neckerchief
// knotted at the neck.
function Overalls({ shirt, denim }: { shirt: string; denim: string }) {
  return (
    <>
      <Body color={shirt} />
      <Block
        size={[0.305, 0.08, 0.215]}
        position={[0, 0.02, 0]}
        radius={0.03}
        color={denim}
      />
      <Block
        size={[0.19, 0.17, 0.03]}
        position={[0, 0.115, 0.093]}
        radius={0.012}
        color={denim}
      />
      <Block
        size={[0.08, 0.05, 0.012]}
        position={[0, 0.13, 0.109]}
        radius={0.005}
        color={shade(denim, 0.85)}
      />
      {SIDES.map((side) => (
        <group key={side} position={[side * 0.07, 0, 0]}>
          {/* Strap up from the bib, then over the rounded shoulder: half a
              torus about the body's top edge, flattened into a band. */}
          <Block
            size={[0.035, 0.04, 0.016]}
            position={[0, 0.2, 0.1]}
            radius={0.006}
            color={denim}
          />
          <mesh
            castShadow
            position={[0, 0.195, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[1, 1, 2.2]}
          >
            <torusGeometry args={[0.1, 0.008, 6, 16, Math.PI]} />
            <meshStandardMaterial color={denim} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.19, 0.112]}>
            <sphereGeometry args={[0.013, 8, 6]} />
            <meshStandardMaterial
              color={COLORS.gold}
              metalness={0.5}
              roughness={0.35}
            />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[0, 0.278, 0]} rotation-x={Math.PI / 2 + 0.15}>
        <torusGeometry args={[0.058, 0.02, 8, 20]} />
        <meshStandardMaterial color={COLORS.neckerchief} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.235, 0.07]} rotation={[0.35, 0, Math.PI]}>
        <coneGeometry args={[0.04, 0.07, 3]} />
        <meshStandardMaterial color={COLORS.neckerchief} roughness={0.85} />
      </mesh>
    </>
  );
}

// Shoulder to hand, hanging down (-y) at rest, with a cuff.
function Arm({
  side,
  clothes,
  ribbed,
  shoulderRef,
  elbowRef,
}: {
  side: number;
  clothes: Clothes;
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

// Curly hair: small balls on a Fibonacci lattice (points spread evenly
// over a sphere), filtered to the hair's area and merged into one
// geometry, over a dark base: a cap of sphere tipped back by HAIR_TILT,
// HAIR_RIM from its pole.
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

// Hair over the scalp and down the temples: under a cap, only the curls
// poking out below it.
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

// Short beard: the triangles of a sphere just larger than the head whose
// centre lies on the jaw, the chin or the sideburns. `p` is a direction
// from the head's centre.
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
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    geometryCache.set("beard", geometry);
  }
  return geometry;
}

// What each outfit wears on its head, if anything (see Head).
type Hat = "kepi" | "engineer" | null;

const HATS: Record<Outfit["style"], Hat> = {
  uniform: "kepi",
  overalls: "engineer",
  hoodie: null,
};

// Round head, centred HEAD_Y above the neck joint, topped (a little askew)
// with the conductor's cap or an engine driver's soft cap, in `hatColor`.
function Head({
  hat,
  hatColor,
  eyeRef,
  browsRef,
}: {
  hat: Hat;
  hatColor: string;
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
      <mesh castShadow geometry={hairCurls(hat !== null)} dispose={null}>
        <meshStandardMaterial color={COLORS.hair} roughness={0.95} />
      </mesh>

      {hat === "kepi" && (
        <group rotation={[-0.05, 0, 0.08]}>
          <Cylinder
            radius={0.143}
            top={0.158}
            height={0.1}
            position={[0, 0.13, 0]}
            color={hatColor}
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

      {hat === "engineer" && (
        <group rotation={[-0.08, 0, -0.07]}>
          <mesh castShadow position={[0, 0.11, -0.005]} scale={[1, 0.62, 1]}>
            <sphereGeometry
              args={[0.158, 24, 12, 0, Math.PI * 2, 0, HALF_PI]}
            />
            <meshStandardMaterial color={hatColor} roughness={0.85} />
          </mesh>
          <Cylinder
            radius={0.147}
            height={0.036}
            position={[0, 0.1, 0]}
            color={shade(hatColor, 0.8)}
            segments={24}
          />
          <mesh position={[0, 0.208, -0.005]}>
            <sphereGeometry args={[0.016, 8, 6]} />
            <meshStandardMaterial color={hatColor} roughness={0.85} />
          </mesh>
          <mesh
            castShadow
            position={[0, 0.088, 0.08]}
            rotation={[0.28, 0, 0]}
            scale={[1, 1, 0.75]}
          >
            <cylinderGeometry
              args={[0.1, 0.1, 0.012, 20, 1, false, -HALF_PI, Math.PI]}
            />
            <meshStandardMaterial
              color={shade(hatColor, 0.8)}
              roughness={0.8}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
