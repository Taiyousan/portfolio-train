import { useRef } from "react";
import type * as THREE from "three";
import { useSeasonValue } from "../hooks/useSeason";
import { SNOW_COLOR } from "../config/seasons";

type Vec3 = [number, number, number];

// A slab of snow on a flat top, rising out of it as the snow cover grows.
// `top` is the centre of that top surface. Without snow the slab sinks
// inside what it rests on, which must be at least as thick.
export default function SnowCover({ top, size }: { top: Vec3; size: Vec3 }) {
  const ref = useRef<THREE.Mesh>(null);
  const [x, y, z] = top;
  const depth = size[1];

  useSeasonValue("snow", (snow) => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.visible = snow > 0.001;
    mesh.position.y = y + depth * (snow - 0.5);
  });

  return (
    <mesh ref={ref} position={[x, y, z]} visible={false} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={SNOW_COLOR} roughness={0.9} />
    </mesh>
  );
}
