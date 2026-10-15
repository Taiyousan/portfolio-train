import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTrainContext } from "../state/TrainContext";
import { useTweaks } from "../debug/tweaks";
import { createSmokeMaterial } from "../shaders/smoke";
import { CHIMNEY_TOP, DRIVING_RADIUS, RAIL_TOP } from "./Locomotive";

// Just above the chimney's mouth.
const START = new THREE.Vector3(...CHIMNEY_TOP).add(
  new THREE.Vector3(0, 0.08, 0),
);
// Plenty at the default settings; past it (a fast train with long-lived
// puffs), the oldest puff is recycled early.
const MAX_PUFFS = 96;
// Distance rolled per turn of the driving wheels.
const WHEEL_TURN = 2 * Math.PI * DRIVING_RADIUS;
// Scale of a puff (an icosahedron of radius 0.3) leaving the chimney and
// at the end of its life.
const START_SCALE = 0.1;
const END_SCALE = 1.6;
// How fast a puff gives in to the air around it (1/s): its blast upward
// settles into a slow buoyant rise, and it comes to a rest relative to the
// air, which streams past the train at the train's speed.
const RISE_DRAG = 3;
const AIR_DRAG = 6;
const BUOYANCY = 0.6;
// Size and blast of a puff at a standstill, relative to one at cruising
// speed: the engine only ticks over.
const IDLE_STRENGTH = 0.55;
// A huge frame (back from another tab) is cut short rather than emitting
// and moving everything in one jump.
const MAX_DELTA = 0.1;
const matrix = new THREE.Matrix4();

type Puff = {
  age: number;
  life: number;
  seed: number;
  size: number;
  // Sideways speed it settles to, so the column wavers a little.
  drift: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
};

// Moves a puff `dt` seconds on, the air streaming backward at `airSpeed`.
// Exponential easing, so the path doesn't depend on the frame rate.
function step(puff: Puff, dt: number, airSpeed: number) {
  const rise = 1 - Math.exp(-RISE_DRAG * dt);
  const air = 1 - Math.exp(-AIR_DRAG * dt);
  const { velocity } = puff;
  velocity.x += (puff.drift - velocity.x) * air;
  velocity.y += (BUOYANCY - velocity.y) * rise;
  velocity.z += (-airSpeed - velocity.z) * air;
  puff.position.addScaledVector(velocity, dt);
}

// Puffs of smoke blasted out of the chimney (wherever the locomotive's hop
// puts it), toon-shaded (see shaders/smoke), all drawn in one call.
//
// Like a real steam engine, the chimney puffs in time with the driving
// wheels: a puff every so much distance rolled, plus a gentle idle rate at
// a standstill. Once out, each puff lives on its own, moved frame by frame
// (blast, buoyancy, then carried off by the air), so a change of speed
// never drags the puffs already out along with it.
export default function Smoke() {
  const { trainSpeedRef, targetTrainSpeed, trainHopRef } = useTrainContext();

  const { lifetime, puffsPerTurn, idleRate, blast } = useTweaks("Smoke", {
    // Seconds a puff lasts.
    lifetime: { value: 2.4, min: 0.5, max: 6, step: 0.1 },
    // Puffs per turn of the driving wheels (a real engine gives 4).
    puffsPerTurn: { value: 1, min: 1, max: 4, step: 1 },
    // Puffs per second at a standstill.
    idleRate: { value: 0.6, min: 0, max: 4, step: 0.1 },
    // Upward speed a puff leaves the chimney at.
    blast: { value: 1.4, min: 0, max: 6, step: 0.1 },
  });

  const material = useMemo(() => createSmokeMaterial(), []);
  const geometry = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(0.3, 2);
    for (const name of ["aAge", "aSeed"]) {
      const attribute = new THREE.InstancedBufferAttribute(
        new Float32Array(MAX_PUFFS),
        1,
      );
      attribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, attribute);
    }
    return geometry;
  }, []);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );

  const meshRef = useRef<THREE.InstancedMesh>(null);
  // Every puff out of the chimney, oldest first; spent ones go back to the
  // pool to be reused.
  const liveRef = useRef<Puff[]>([]);
  const poolRef = useRef<Puff[]>([]);
  // Progress toward the next puff: one is released each time it reaches 1.
  const phaseRef = useRef(0);

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(delta, MAX_DELTA);
    const speed = trainSpeedRef.current;
    const live = liveRef.current;
    const pool = poolRef.current;

    // Age and move the puffs already out, retiring the spent ones.
    let kept = 0;
    for (const puff of live) {
      puff.age += dt;
      if (puff.age >= puff.life) {
        pool.push(puff);
        continue;
      }
      step(puff, dt, speed);
      live[kept++] = puff;
    }
    live.length = kept;

    // Release the puffs due this frame, each already aged and moved by the
    // time since it was due, so that fast puffs don't bunch up per frame.
    const rate = (speed / WHEEL_TURN) * puffsPerTurn + idleRate;
    phaseRef.current += rate * dt;
    const effort = THREE.MathUtils.clamp(
      speed / Math.max(targetTrainSpeed, 1),
      0,
      1,
    );
    const strength = THREE.MathUtils.lerp(IDLE_STRENGTH, 1, effort);
    // The chimney's mouth, wherever the locomotive's hop puts it (squashed
    // and stretched about the rails, see Train).
    const { lift, stretch, bulge } = trainHopRef.current;
    const mouthY = RAIL_TOP + lift + (START.y - RAIL_TOP) * stretch;
    while (phaseRef.current >= 1) {
      phaseRef.current -= 1;
      const puff =
        live.length >= MAX_PUFFS
          ? live.shift()!
          : (pool.pop() ?? {
              age: 0,
              life: 0,
              seed: 0,
              size: 0,
              drift: 0,
              position: new THREE.Vector3(),
              velocity: new THREE.Vector3(),
            });
      const since = phaseRef.current / rate;
      puff.age = since;
      puff.life = lifetime * THREE.MathUtils.randFloat(0.85, 1.15);
      puff.seed = Math.random() * 100;
      puff.size = strength * THREE.MathUtils.randFloat(0.85, 1.15);
      puff.drift = THREE.MathUtils.randFloatSpread(0.3);
      puff.position.set(START.x * bulge, mouthY, START.z * bulge);
      puff.velocity.set(
        THREE.MathUtils.randFloatSpread(0.2),
        blast * strength * THREE.MathUtils.randFloat(0.85, 1.15),
        0,
      );
      step(puff, since, speed);
      // Released oldest first, so pushed in age order.
      live.push(puff);
    }

    // Through the mesh: the material and geometry are render-time values.
    const ages = mesh.geometry.getAttribute("aAge");
    const seeds = mesh.geometry.getAttribute("aSeed");
    live.forEach((puff, i) => {
      const t = puff.age / puff.life;
      // Balloons out of the chimney, then swells more slowly.
      const grow = 1 - (1 - t) * (1 - t);
      const scale =
        puff.size * THREE.MathUtils.lerp(START_SCALE, END_SCALE, grow);
      matrix.makeScale(scale, scale, scale).setPosition(puff.position);
      mesh.setMatrixAt(i, matrix);
      ages.setX(i, t);
      seeds.setX(i, puff.seed);
    });
    mesh.count = live.length;
    mesh.instanceMatrix.needsUpdate = true;
    ages.needsUpdate = true;
    seeds.needsUpdate = true;
    (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value =
      clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={meshRef}
      // Its count starts at MAX_PUFFS, so the shader warm-up draws it; the
      // first frame sets the real count.
      args={[geometry, material, MAX_PUFFS]}
      // Its puffs drift far from the mesh's own bounds.
      frustumCulled={false}
    />
  );
}
