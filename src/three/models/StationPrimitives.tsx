import { RoundedBox } from "@react-three/drei";

// Rounded building blocks and palette shared by the station's decor
// (StationDecor), its props (StationProps) and its departures board.

export type Vec3 = [number, number, number];

export const STATION_COLORS = {
  platform: "#b3a288",
  platformSide: "#8f7d66",
  edge: "#e2b54c",
  wall: "#efdfbf",
  plinth: "#a8876a",
  roof: "#a4493a",
  wood: "#7b5b3e",
  darkWood: "#4a3526",
  iron: "#34353b",
  benchWood: "#c08552",
  bin: "#4f7d4c",
  pot: "#b8643f",
  bush: "#5d8f4a",
  bushLight: "#78a857",
  suitcase: "#b5533c",
  lining: "#e6d3ae",
  trunk: "#5f86a0",
  strap: "#5a3a26",
  sign: "#f1e8d4",
  ink: "#3b2a20",
  light: "#ffcf87",
  // Window glass and lamp lanterns once switched off.
  glassOff: "#3d4450",
};

export const FLOWER_COLORS = ["#f08a5d", "#f5d36b", "#e2769a", "#fff3e0"];

export function Block({
  size,
  position,
  rotation,
  radius = 0.2,
  color,
  emissive,
}: {
  size: Vec3;
  position?: Vec3;
  rotation?: Vec3;
  radius?: number;
  color: string;
  emissive?: number;
}) {
  return (
    <RoundedBox
      args={size}
      radius={Math.min(radius, ...size.map((d) => d / 2 - 0.001))}
      smoothness={3}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={0.75}
        emissive={emissive ? color : "#000000"}
        emissiveIntensity={emissive ?? 0}
      />
    </RoundedBox>
  );
}

export function Cylinder({
  radius,
  height,
  position,
  rotation,
  color,
  top = radius,
  segments = 16,
}: {
  radius: number;
  height: number;
  position?: Vec3;
  rotation?: Vec3;
  color: string;
  top?: number;
  segments?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[top, radius, height, segments]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}
