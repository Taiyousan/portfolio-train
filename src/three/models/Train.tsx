import { useEffect, useRef } from "react";
import { useGLTF, Center, Resize } from "@react-three/drei";
import { animated } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTrainContext } from "../state/TrainContext";
import usePopIn from "../hooks/usePopIn";
import Driver from "./Driver";

const WHEEL_NAMES = ["EngineSpokes1", "EngineSpokes2", "EngineSpokes3"];

// Same motion as drei's <Float speed={50} rotationIntensity={0.1}
// floatIntensity={0.01}>, but its phase advances with the train's speed
// and its amplitude fades to zero at a standstill, so the train comes to
// rest upright instead of freezing mid-tilt.
const SWAY_RATE = 12.5;
const SWAY_ROTATION = 0.1;
const SWAY_LIFT = 0.01;

export default function Train() {
  const { trainSpeedRef, targetTrainSpeed } = useTrainContext();
  const swayRef = useRef<THREE.Group>(null);
  const swayPhaseRef = useRef(0);
  const { scene } = useGLTF("/models/wagon.glb");
  const scale = usePopIn();

  const wheelsRef = useRef<THREE.Object3D[]>([]);
  // Rolling-without-slipping angular speed (rad/s) = linear speed / radius.
  // Measured from the actual wheel geometry once it's live in the scene
  // graph (see below) so it stays correct if the model or its Resize scale
  // ever changes, instead of a guessed constant.
  const wheelRadiusRef = useRef<number | null>(null);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    wheelsRef.current = WHEEL_NAMES.map((name) =>
      scene.getObjectByName(name),
    ).filter((wheel): wheel is THREE.Object3D => wheel !== undefined);
  }, [scene]);

  useFrame((_, delta) => {
    const sway = swayRef.current;
    if (sway) {
      const cruise = Math.max(targetTrainSpeed, 1);
      const speedRatio = trainSpeedRef.current / cruise;
      swayPhaseRef.current += delta * SWAY_RATE * speedRatio;
      const amplitude = THREE.MathUtils.smoothstep(speedRatio, 0, 1);
      const phase = swayPhaseRef.current;
      sway.rotation.set(
        (Math.cos(phase) / 8) * SWAY_ROTATION * amplitude,
        (Math.sin(phase) / 8) * SWAY_ROTATION * amplitude,
        (Math.sin(phase) / 20) * SWAY_ROTATION * amplitude,
      );
      sway.position.y = (Math.sin(phase) / 10) * SWAY_LIFT * amplitude;
    }

    const wheels = wheelsRef.current;
    if (wheels.length === 0) return;

    // Measured lazily on the first frame instead of in a mount effect: at
    // mount time the mesh hasn't been through a render pass yet, so its
    // matrixWorld/geometry bounds aren't reliable (measured out as all
    // zeros in practice, which silently broke rotation). By the first
    // useFrame tick it's actually live in the scene, with Resize/Center/
    // Float already applied, so a world-space bounding box gives the real
    // radius directly — no separate scale-factor math needed.
    if (wheelRadiusRef.current === null) {
      const wheelSize = new THREE.Box3()
        .setFromObject(wheels[wheels.length - 1])
        .getSize(new THREE.Vector3());
      const measuredRadius =
        Math.max(wheelSize.x, wheelSize.y, wheelSize.z) / 2;
      wheelRadiusRef.current =
        Number.isFinite(measuredRadius) && measuredRadius > 0.01
          ? measuredRadius
          : 0.3;
    }

    const spin = (delta * trainSpeedRef.current) / wheelRadiusRef.current;
    wheels.forEach((wheel) => {
      wheel.rotation.x += spin;
    });
  });

  return (
    <animated.group scale={scale}>
      <Resize scale={2}>
        <Center>
          <group ref={swayRef}>
            <primitive object={scene} />
            <Driver position={[0.027, -0.41, -1.46]} scale={1.5} />
          </group>
        </Center>
      </Resize>
    </animated.group>
  );
}

useGLTF.preload("/models/wagon.glb");
