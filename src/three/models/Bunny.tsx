import { useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { useTrainContext } from "../state/TrainContext";
import { STOP_SIDE } from "../config/scene";
import { STATION_COLORS } from "./StationPrimitives";

const COLORS = {
  fur: "#a9805c",
  light: "#f1e6d4",
  pink: "#e9a1a4",
  eye: STATION_COLORS.ink,
};

// World units per bunny unit (the bunny's body is about 1 long).
const SCALE = 0.34;
// Seconds between two runs, and before the first.
const WAIT: [number, number] = [25, 50];
const FIRST_WAIT: [number, number] = [6, 15];
// A hop: its duration (s), height and length (world units).
const HOP_TIME = 0.34;
const HOP_HEIGHT = 0.14;
const HOP_LENGTH: [number, number] = [0.28, 0.48];
// Distance from the track a bunny keeps to, on either side: mostly the
// stops' side, in the clear strip behind the train; or between the train
// and the camera.
const BANDS: { side: number; band: [number, number]; share: number }[] = [
  { side: STOP_SIDE, band: [1.4, 4.4], share: 0.75 },
  { side: -STOP_SIDE, band: [1.2, 2.4], share: 0.25 },
];
// Starts just out of frame ahead of the train (+z), and is gone once this
// far behind it, or after its hops, off into the forest.
const START_Z: [number, number] = [8.5, 10.5];
const END_Z = -12;
const HOPS: [number, number] = [14, 30];
const POP_RATE = 8;

const rand = ([min, max]: [number, number]) => min + Math.random() * (max - min);

type Run = {
  active: boolean;
  // Seconds until the next run, while inactive.
  wait: number;
  side: number;
  band: [number, number];
  // Ground position, the hop it's on (from → to), and where it faces
  // (radians about y, 0 = +z).
  x: number;
  z: number;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  heading: number;
  // Progress through the current hop (0 → 1), or null while resting.
  hop: number | null;
  rest: number;
  hops: number;
  // Popping in (→ 1) or ducking away (→ 0).
  size: number;
  leaving: boolean;
  // Idle animation: a look to one side, an ear twitch.
  look: number;
  twitch: number;
};

function idleRun(wait: number): Run {
  return {
    active: false,
    wait,
    side: STOP_SIDE,
    band: [1, 1],
    x: 0,
    z: 0,
    fromX: 0,
    fromZ: 0,
    toX: 0,
    toZ: 0,
    heading: 0,
    hop: null,
    rest: 0,
    hops: 0,
    size: 0,
    leaving: false,
    look: 0,
    twitch: 0,
  };
}

function startRun(run: Run) {
  const pick = Math.random();
  const { side, band } = pick < BANDS[0].share ? BANDS[0] : BANDS[1];
  run.active = true;
  run.side = side;
  run.band = band;
  run.x = side * rand(band);
  run.z = rand(START_Z);
  run.fromX = run.toX = run.x;
  run.fromZ = run.toZ = run.z;
  // Mostly racing the train, sometimes off the other way.
  run.heading = (Math.random() < 0.7 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.6;
  run.hop = null;
  run.rest = Math.random() * 0.5;
  run.hops = Math.round(rand(HOPS));
  run.size = 0;
  run.leaving = false;
  run.look = 0;
  run.twitch = 0;
}

// How long to rest after landing: mostly a bounce straight into the next
// hop, sometimes a pause to look round, now and then a longer sit.
function restTime() {
  const roll = Math.random();
  if (roll < 0.65) return rand([0.04, 0.18]);
  if (roll < 0.95) return rand([0.5, 1.4]);
  return rand([1.6, 2.6]);
}

function nextHop(run: Run) {
  const [near, far] = run.band;
  // Out of hops: off into the forest, away from the track.
  const away = run.hops <= 0;
  if (away) {
    const outward = run.side > 0 ? Math.PI / 2 : -Math.PI / 2;
    run.heading += (outward - run.heading) * 0.5;
  } else {
    run.heading += (Math.random() - 0.5) * 0.7;
  }
  const length = rand(HOP_LENGTH);
  let toX = run.x + Math.sin(run.heading) * length;
  const toZ = run.z + Math.cos(run.heading) * length;
  // Bounced back into its band, never onto the track.
  const distance = Math.abs(toX);
  if (distance < near || (!away && distance > far) || Math.sign(toX) !== run.side) {
    run.heading = -run.heading;
    toX = run.x + Math.sin(run.heading) * length;
  }
  run.fromX = run.x;
  run.fromZ = run.z;
  run.toX = toX;
  run.toZ = toZ;
  run.hop = 0;
  run.hops -= 1;
}

const easeInOut = (t: number) => t * t * (3 - 2 * t);

// The bunny and its runs, in world units along the scrolling forest floor,
// kept in a ref and stepped each frame.
function HoppingBunny({ firstWait }: { firstWait: number }) {
  const { mode, trainSpeedRef } = useTrainContext();
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const runRef = useRef<Run>(idleRun(firstWait));
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const noseRef = useRef<THREE.Mesh>(null);
  const earRefs = useRef<(THREE.Group | null)[]>([]);
  const feetRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    const run = runRef.current;
    const root = rootRef.current;
    if (!root) return;

    if (!run.active) {
      root.visible = false;
      run.wait -= delta;
      if (run.wait > 0) return;
      // Only out on the line, never at a stop or in the workshop.
      if (mode !== "ride" || reducedMotion) {
        run.wait = rand([1, 3]);
        return;
      }
      startRun(run);
    }

    // The ground scrolls back with the train's speed, and the bunny on it.
    const scroll = trainSpeedRef.current * delta;
    run.z -= scroll;
    run.fromZ -= scroll;
    run.toZ -= scroll;

    if (mode !== "ride") run.leaving = true;
    run.size = THREE.MathUtils.damp(run.size, run.leaving ? 0 : 1, POP_RATE, delta);
    const gone =
      run.z < END_Z ||
      Math.abs(run.x) > run.band[1] + 3 ||
      (run.leaving && run.size < 0.01);
    if (gone) {
      Object.assign(run, idleRun(rand(WAIT)));
      root.visible = false;
      return;
    }

    let lift = 0;
    let pitch = 0;
    let stretch = 0;
    if (run.hop === null) {
      run.rest -= delta;
      // Looks aside during the longer pauses.
      run.look = THREE.MathUtils.damp(
        run.look,
        run.rest > 0.4 ? Math.sin(clock.elapsedTime * 1.3 + run.z) * 0.6 : 0,
        5,
        delta,
      );
      if (run.rest <= 0) nextHop(run);
    }
    if (run.hop !== null) {
      run.hop = Math.min(run.hop + delta / HOP_TIME, 1);
      const t = run.hop;
      const along = easeInOut(t);
      run.x = run.fromX + (run.toX - run.fromX) * along;
      run.z = run.fromZ + (run.toZ - run.fromZ) * along;
      lift = HOP_HEIGHT * 4 * t * (1 - t);
      // Nose up as it leaves the ground, down as it lands.
      pitch = -0.45 * Math.sin(Math.PI * 2 * t);
      stretch = Math.sin(Math.PI * t);
      if (t >= 1) {
        run.hop = null;
        run.rest = restTime();
      }
    }

    // Ears flick now and then, or fold back in the air.
    run.twitch = Math.max(run.twitch - delta, 0);
    if (run.twitch === 0 && Math.random() < delta * 0.6) run.twitch = 0.25;
    const flick = run.twitch > 0 ? Math.sin((run.twitch / 0.25) * Math.PI) : 0;

    root.visible = true;
    root.position.set(run.x, lift, run.z);
    root.rotation.y = run.heading;
    root.scale.setScalar(SCALE * run.size);
    if (bodyRef.current) {
      bodyRef.current.rotation.x = pitch;
      bodyRef.current.scale.set(1 - 0.06 * stretch, 1 - 0.04 * stretch, 1 + 0.12 * stretch);
    }
    if (headRef.current) headRef.current.rotation.y = run.look;
    if (noseRef.current) {
      noseRef.current.scale.setScalar(1 + 0.25 * Math.max(Math.sin(clock.elapsedTime * 22), 0));
    }
    earRefs.current.forEach((ear, i) => {
      if (!ear) return;
      ear.rotation.x = -0.25 - 0.6 * stretch - (i === 0 ? 0.5 * flick : 0);
    });
    if (feetRef.current) feetRef.current.position.z = -0.18 * stretch;
  });

  return (
    <group ref={rootRef} visible={false}>
      <group ref={bodyRef} position={[0, 0.06, 0]}>
        <BunnyBody headRef={headRef} noseRef={noseRef} earRefs={earRefs} />
      </group>
      <group ref={feetRef}>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * 0.22, 0.06, -0.12]}
            scale={[0.7, 0.45, 1.6]}
            castShadow
          >
            <sphereGeometry args={[0.13, 12, 8]} />
            <meshStandardMaterial color={COLORS.fur} roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Ball({
  radius,
  position,
  scale,
  color,
  detail = 14,
  shadow = false,
}: {
  radius: number;
  position: [number, number, number];
  scale?: [number, number, number];
  color: string;
  detail?: number;
  shadow?: boolean;
}) {
  return (
    <mesh position={position} scale={scale} castShadow={shadow}>
      <sphereGeometry args={[radius, detail, Math.round(detail * 0.7)]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

// A round cartoon bunny, facing +z, its pivot under its middle: an egg of
// a body with a cream chest and cotton tail, a round head with a muzzle,
// a pink nose and two long ears, and small front paws (the big hind feet
// are its parent's, to kick out in a hop).
function BunnyBody({
  headRef,
  noseRef,
  earRefs,
}: {
  headRef: RefObject<THREE.Group | null>;
  noseRef: RefObject<THREE.Mesh | null>;
  earRefs: RefObject<(THREE.Group | null)[]>;
}) {
  return (
    <>
      <Ball radius={0.5} position={[0, 0.36, -0.05]} scale={[0.78, 0.72, 1]} color={COLORS.fur} shadow />
      <Ball radius={0.3} position={[0, 0.32, 0.17]} scale={[0.85, 0.9, 0.9]} color={COLORS.light} />
      <Ball radius={0.13} position={[0, 0.42, -0.5]} color={COLORS.light} detail={10} />
      {[-1, 1].map((side) => (
        <Ball
          key={side}
          radius={0.07}
          position={[side * 0.13, 0.0, 0.3]}
          scale={[1, 0.8, 1.4]}
          color={COLORS.fur}
          detail={8}
        />
      ))}
      <group ref={headRef} position={[0, 0.68, 0.36]}>
        <Ball radius={0.3} position={[0, 0, 0]} color={COLORS.fur} shadow />
        <Ball radius={0.13} position={[0, -0.08, 0.22]} scale={[1.2, 0.85, 1]} color={COLORS.light} detail={10} />
        <mesh ref={noseRef} position={[0, -0.03, 0.33]}>
          <sphereGeometry args={[0.045, 8, 6]} />
          <meshStandardMaterial color={COLORS.pink} roughness={0.6} />
        </mesh>
        {[-1, 1].map((side) => (
          <Ball
            key={side}
            radius={0.05}
            position={[side * 0.15, 0.06, 0.22]}
            color={COLORS.eye}
            detail={8}
          />
        ))}
        {[-1, 1].map((side, i) => (
          <group
            key={side}
            ref={(ear) => {
              earRefs.current[i] = ear;
            }}
            position={[side * 0.1, 0.2, -0.06]}
            rotation-z={side * -0.18}
          >
            <mesh position={[0, 0.26, 0]} castShadow>
              <capsuleGeometry args={[0.075, 0.36, 4, 10]} />
              <meshStandardMaterial color={COLORS.fur} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.26, 0.045]} scale={[1, 1, 0.5]}>
              <capsuleGeometry args={[0.042, 0.28, 4, 8]} />
              <meshStandardMaterial color={COLORS.pink} roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}

// A bunny that now and then hops along the line beside the train, pausing
// to look round, before falling behind or darting off into the forest.
// Only while riding, and not at all with reduced motion. Place on the
// forest floor.
export default function Bunny(props: ThreeElements["group"]) {
  const [firstWait] = useState(() => rand(FIRST_WAIT));
  return (
    <group {...props}>
      <HoppingBunny firstWait={firstWait} />
    </group>
  );
}
