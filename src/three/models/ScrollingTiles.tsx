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

// Copies of a tiled model scrolling along z (see useScrollingLoop), for an
// endless track. Each tile has its own <Resize>, scaling its longest side
// (along z) to `resizeScale` world units, so tiles spaced that far apart
// abut seamlessly whatever their count.
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

  // A scene can only be mounted once: every other tile gets a clone.
  const copies = useMemo(
    () =>
      Array.from({ length: tileCount }, (_, index) =>
        index === 0 ? scene : scene.clone(),
      ),
    [scene, tileCount],
  );

  // Set on each mesh: frustumCulled doesn't carry down to children.
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
