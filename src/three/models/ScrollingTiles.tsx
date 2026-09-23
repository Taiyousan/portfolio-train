import { useEffect, useMemo } from "react";
import { useGLTF, Resize } from "@react-three/drei";
import { animated } from "@react-spring/three";
import type { ThreeElements } from "@react-three/fiber";
import type * as THREE from "three";
import useScrollingLoop from "../hooks/useScrollingLoop";
import usePopIn from "../hooks/usePopIn";

type ScrollingTilesProps = Omit<
  ThreeElements["group"],
  "castShadow" | "receiveShadow"
> & {
  modelPath: string;
  resizeScale: number;
  tileCount?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

// Copies of a tiled model scroll along z to fake an endless track/ground —
// the scrolling/looping itself is handled by useScrollingLoop.
//
// Each tile gets its OWN <Resize>, not one wrapping the whole row: Resize
// scales to fit the combined bounding box of everything inside it, so a
// single Resize around N positioned tiles rescales (and desyncs the speed
// of) every tile whenever N changes. Tiles are authored with their longest
// side along z, so after an individual Resize that side is exactly
// `resizeScale` world units — tiles spaced that far apart abut seamlessly,
// and world-space speed no longer depends on tileCount.
export default function ScrollingTiles({
  modelPath,
  resizeScale,
  receiveShadow = false,
  castShadow = false,
  tileCount = 4,
  ...groupProps
}: ScrollingTilesProps) {
  const { scene } = useGLTF(modelPath);
  const tiles = useScrollingLoop(tileCount, resizeScale);
  const scale = usePopIn();

  // The original scene can only be mounted once, so every other tile
  // gets its own clone.
  const copies = useMemo(
    () =>
      Array.from({ length: tileCount }, (_, index) =>
        index === 0 ? scene : scene.clone(),
      ),
    [scene, tileCount],
  );

  // frustumCulled only affects the object it's set on, not its children —
  // setting it on the root <primitive> group is a no-op for a multi-mesh
  // glTF scene, so it has to be set per mesh here instead.
  useEffect(() => {
    copies.forEach((copy) =>
      copy.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = castShadow;
          child.receiveShadow = receiveShadow;
          child.frustumCulled = false;
        }
      }),
    );
  }, [copies, castShadow, receiveShadow]);

  return (
    <group {...groupProps}>
      <animated.group scale={scale}>
        {tiles.map(({ ref, position }, index) => (
          <group key={index} ref={ref} position={position}>
            <Resize scale={resizeScale}>
              <primitive object={copies[index]} />
            </Resize>
          </group>
        ))}
      </animated.group>
    </group>
  );
}
