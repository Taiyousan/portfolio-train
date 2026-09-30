import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useTrainContext } from "../state/TrainContext";
import { createSmokeMaterial } from "../shaders/smoke";
import { CHIMNEY_TOP } from "./Locomotive";

// Just above the chimney's mouth.
const START_POSITION = new THREE.Vector3(...CHIMNEY_TOP).add(
  new THREE.Vector3(0, 0.08, 0),
);
const START_SCALE = 0.1;
// Below this speed the chimney stops emitting new puffs.
const EMIT_MIN_SPEED = 0.3;

// Puffs of smoke rising from the chimney and drifting behind the train,
// toon-shaded by a custom shader (see shaders/smoke.ts).
export default function Smoke() {
  const { trainSpeedRef } = useTrainContext();

  const { numSmokes, duration } = useControls("Smoke", {
    numSmokes: { value: 5, min: 1, max: 20, step: 1 },
    duration: { value: 2, min: 0.5, max: 10, step: 0.1 },
  });

  // One material per puff: each has its own age and noise seed.
  const materials = useMemo(
    () => Array.from({ length: numSmokes }, () => createSmokeMaterial()),
    [numSmokes],
  );
  useEffect(
    () => () => materials.forEach((material) => material.dispose()),
    [materials],
  );

  // A single ref array (populated via callback refs below) instead of one
  // useRef() per puff — numSmokes can change at runtime via the debug
  // panel, and calling useRef() a variable number of times per render
  // breaks React's rules of hooks.
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  // Each puff's age in seconds. Offset evenly so they are spread out.
  const agesRef = useRef<number[]>([]);
  // A puff that finishes its life while the train is stopped goes idle
  // instead of restarting; it is re-released, staggered, once moving again.
  const idleRef = useRef<boolean[]>([]);

  useFrame(({ clock }, delta) => {
    const ages = agesRef.current;
    if (ages.length !== numSmokes) {
      agesRef.current = Array.from(
        { length: numSmokes },
        (_, index) => (index * duration) / numSmokes,
      );
      idleRef.current = Array.from({ length: numSmokes }, () => false);
      return;
    }

    const emitting = trainSpeedRef.current > EMIT_MIN_SPEED;
    const idle = idleRef.current;

    // Once released, smoke is left behind by the passing air rather than
    // travelling with the train — its backward drift should match the
    // speed the rest of the world scrolls past at, not a fixed constant,
    // or it looks like it's riding along with the train.
    const driftDistance = trainSpeedRef.current * duration;

    ages.forEach((age, index) => {
      const mesh = meshRefs.current[index];
      if (!mesh) return;

      if (idle[index]) {
        if (!emitting) return;
        // Restart with a delay proportional to the puff's slot.
        idle[index] = false;
        age = -(index * duration) / numSmokes;
      }
      // Negative age = waiting to be released.
      if (age < 0) {
        ages[index] = age + delta;
        mesh.visible = false;
        return;
      }
      mesh.visible = true;

      const nextAge = (age + delta) % duration;
      ages[index] = nextAge;
      if (nextAge < age && !emitting) {
        idle[index] = true;
        mesh.visible = false;
        return;
      }
      const { uniforms } = materials[index];

      const t = nextAge / duration; // 0 → 1 over the puff's lifetime
      mesh.position.z = START_POSITION.z - Math.pow(t, 1.2) * driftDistance;
      mesh.position.y = START_POSITION.y + t * 2.5;
      mesh.scale.setScalar(START_SCALE * (1 + t * 15.4));

      uniforms.uAge.value = t;
      uniforms.uTime.value = clock.elapsedTime;
      // A new shape each time the puff loops back to the chimney.
      if (nextAge < age) uniforms.uSeed.value = Math.random() * 100;
    });
  });

  return (
    <group>
      {materials.map((material, index) => (
        <mesh
          key={index}
          ref={(el) => {
            meshRefs.current[index] = el;
          }}
          material={material}
          position={START_POSITION}
          scale={START_SCALE}
        >
          <icosahedronGeometry args={[0.3, 2]} />
        </mesh>
      ))}
    </group>
  );
}
