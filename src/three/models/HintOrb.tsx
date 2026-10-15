import { useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { useTweaks } from "../debug/tweaks";
import useHintReveal from "../hooks/useHintReveal";
import type { HintedProp } from "../state/StationHints";
import useReducedMotion from "../hooks/useReducedMotion";

// A small glowing ball floating over a clickable prop not clicked yet, once
// the camera has settled at its stop (see useHintReveal). It bobs gently,
// brightens while its prop is hovered, and shrinks away once it's clicked.
// Its colour is pushed past white for the bloom to make it glow. Still with
// reduced motion. Sizes in the prop's units, speeds per second.
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
  const orb = useTweaks("Indices", {
    radius: { value: ORB.radius, min: 0.02, max: 0.5, step: 0.01 },
    color: ORB.color,
    glow: { value: ORB.glow, min: 0, max: 5, step: 0.1 },
    hoverGlow: { value: ORB.hoverGlow, min: 1, max: 3, step: 0.05 },
    hoverGrow: { value: ORB.hoverGrow, min: 1, max: 2, step: 0.05 },
    ease: { value: ORB.ease, min: 1, max: 20, step: 0.5 },
    bob: { value: ORB.bob, min: 0, max: 0.3, step: 0.01 },
    bobSpeed: { value: ORB.bobSpeed, min: 0, max: 5, step: 0.1 },
  });
  const meshRef = useRef<THREE.Mesh>(null);
  const size = useHintReveal(meshRef, () => hint.current.discovered);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  // Each ball bobs out of step with the others.
  const [phase] = useState(() => Math.random() * TAU);
  const reducedMotion = useReducedMotion();
  // Eased hover (0 to 1).
  const hoverRef = useRef(0);

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    const ease = reducedMotion ? 1 : Math.min(delta * orb.ease, 1);
    const hover = (hoverRef.current +=
      ((hint.current.hovered ? 1 : 0) - hoverRef.current) * ease);
    const shown = size.get();

    // Gone, it's also hidden, so it can't catch the pointer.
    mesh.visible = shown > 0.01;
    mesh.scale.setScalar(
      orb.radius * Math.max(shown, 0) * (1 + (orb.hoverGrow - 1) * hover),
    );
    mesh.position.y =
      position[1] +
      (reducedMotion
        ? 0
        : orb.bob * Math.sin(clock.elapsedTime * orb.bobSpeed + phase));
    material.color
      .set(orb.color)
      .multiplyScalar(orb.glow * (1 + (orb.hoverGlow - 1) * hover));
  });

  return (
    <mesh ref={meshRef} position={position} scale={0} visible={false}>
      {/* Unit sphere, scaled to the radius. */}
      <sphereGeometry args={[1, 16, 12]} />
      <meshBasicMaterial ref={materialRef} toneMapped={false} />
    </mesh>
  );
}
