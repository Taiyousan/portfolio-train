import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useTrainContext } from "../state/TrainContext";

const START_POSITION = new THREE.Vector3(0, 0.55, 0.48);
const START_SCALE = 0.1;

// Puffs of smoke rising from the chimney and drifting behind the train.
// Plain translucent material for now: the old version used a NodeToy
// shader, whose React binding only supports R3F 8.
export default function Smoke() {
  const { trainSpeed } = useTrainContext();

  const { numSmokes, duration } = useControls("Smoke", {
    numSmokes: { value: 5, min: 1, max: 20, step: 1 },
    duration: { value: 2, min: 0.5, max: 10, step: 0.1 },
  });

  // A single ref array (populated via callback refs below) instead of one
  // useRef() per puff — numSmokes can change at runtime via the debug
  // panel, and calling useRef() a variable number of times per render
  // breaks React's rules of hooks.
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  // Each puff's age in seconds. Offset evenly so they are spread out.
  const agesRef = useRef<number[]>([]);

  useFrame((_, delta) => {
    const ages = agesRef.current;
    if (ages.length !== numSmokes) {
      agesRef.current = Array.from(
        { length: numSmokes },
        (_, index) => (index * duration) / numSmokes,
      );
      return;
    }

    // Once released, smoke is left behind by the passing air rather than
    // travelling with the train — its backward drift should match the
    // speed the rest of the world scrolls past at, not a fixed constant,
    // or it looks like it's riding along with the train.
    const driftDistance = trainSpeed * duration;

    ages.forEach((age, index) => {
      const nextAge = (age + delta) % duration;
      ages[index] = nextAge;

      const mesh = meshRefs.current[index];
      if (!mesh) return;

      const t = nextAge / duration; // 0 → 1 over the puff's lifetime
      mesh.position.z = START_POSITION.z - Math.pow(t, 1.2) * driftDistance;
      mesh.position.y = START_POSITION.y + t * 2.5;
      mesh.scale.setScalar(START_SCALE * (1 + t * 15.4));
    });
  });

  return (
    <group>
      {Array.from({ length: numSmokes }, (_, index) => (
        <mesh
          key={index}
          ref={(el) => {
            meshRefs.current[index] = el;
          }}
          position={START_POSITION}
          scale={START_SCALE}
        >
          <sphereGeometry args={[0.3, 18, 18]} />
          <meshStandardMaterial color="white" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}
