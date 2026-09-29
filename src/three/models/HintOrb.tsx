import { useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";
import { useTrainContext } from "../state/TrainContext";
import { useStationHints, type HintedProp } from "../state/StationHints";

// A small glowing yellow ball floating over a clickable prop not clicked yet
// (see useStationClick), while the train waits at its stop.
// It grows in and bobs gently, brightens a little while its prop is
// hovered, and shrinks away once the prop is clicked. Its colour is pushed
// past white so the scene's bloom makes it glow. Still with reduced
// motion, appearing and going at once. Sizes in the prop's units, speeds
// per second. Tunable in the Leva "Indices" group, shared by all the balls.
const ORB = {
  radius: 0.04,
  color: "#ffd35c",
  glow: 2,
  hoverGlow: 1.5,
  hoverGrow: 1.15,
  ease: 6,
  bob: 0.03,
  bobSpeed: 5,
};
const TAU = Math.PI * 2;

export default function HintOrb({
  hint,
  position,
}: {
  hint: RefObject<HintedProp>;
  position: [number, number, number];
}) {
  const orb = useControls("Indices", {
    radius: { value: ORB.radius, min: 0.02, max: 0.5, step: 0.01 },
    color: ORB.color,
    glow: { value: ORB.glow, min: 0, max: 5, step: 0.1 },
    hoverGlow: { value: ORB.hoverGlow, min: 1, max: 3, step: 0.05 },
    hoverGrow: { value: ORB.hoverGrow, min: 1, max: 2, step: 0.05 },
    ease: { value: ORB.ease, min: 1, max: 20, step: 0.5 },
    bob: { value: ORB.bob, min: 0, max: 0.3, step: 0.01 },
    bobSpeed: { value: ORB.bobSpeed, min: 0, max: 5, step: 0.1 },
  });
  const { mode, stop, boardFocused } = useTrainContext();
  const hints = useStationHints();
  const shown =
    hints.hinted && mode === "stopped" && stop === hints.stop && !boardFocused;
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  // Each ball bobs out of step with the others.
  const [phase] = useState(() => Math.random() * TAU);
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  // Eased presence and hover (0 to 1).
  const stateRef = useRef({ size: 0, hover: 0 });

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    const prop = hint.current;
    const state = stateRef.current;
    const ease = reducedMotion ? 1 : Math.min(delta * orb.ease, 1);
    state.size += ((shown && !prop.discovered ? 1 : 0) - state.size) * ease;
    state.hover += ((prop.hovered ? 1 : 0) - state.hover) * ease;

    // Gone, it's also hidden, so it can't catch the pointer.
    mesh.visible = state.size > 0.01;
    mesh.scale.setScalar(
      orb.radius * state.size * (1 + (orb.hoverGrow - 1) * state.hover),
    );
    mesh.position.y =
      position[1] +
      (reducedMotion
        ? 0
        : orb.bob * Math.sin(clock.elapsedTime * orb.bobSpeed + phase));
    material.color
      .set(orb.color)
      .multiplyScalar(orb.glow * (1 + (orb.hoverGlow - 1) * state.hover));
  });

  return (
    <mesh ref={meshRef} position={position} scale={0} visible={false}>
      {/* Unit sphere, scaled to the radius. */}
      <sphereGeometry args={[1, 16, 12]} />
      <meshBasicMaterial ref={materialRef} toneMapped={false} />
    </mesh>
  );
}
