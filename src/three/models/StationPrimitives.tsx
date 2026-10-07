import { createContext, use, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { animated, type SpringValue } from "@react-spring/three";
import * as THREE from "three";
import { isSnowy, pinSnow, snowy } from "../shaders/snow";

// Rounded building blocks and palette shared by the station's decor
// (StationDecor), its props (StationProps) and its departures board, and by
// the home (HomeDecor), built in the same units: the house shape, windows,
// window boxes, and the group the fittings pop in with. Blocks and
// cylinders take the snow (see shaders/snow), except inside a NoSnow; it's
// pinned to them inside a PinnedSnow.

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

const SnowContext = createContext(true);

// Keeps the snow off the blocks and cylinders inside: off what's in use
// (floors, the desk) or warm (the boiler), what turns (wheels, rods) and
// would carry it round, and the characters.
export function NoSnow({ children }: { children: ReactNode }) {
  return <SnowContext value={false}>{children}</SnowContext>;
}

// Pins the snow on the parts inside to them (see pinSnow), for parts that
// move: what's white at rest stays white as they tip over or swing open.
// Read on the first frame, when they're all at rest (as they lie inside
// it: it must be upright then).
export function PinnedSnow({
  position,
  children,
}: {
  position?: Vec3;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const pinnedRef = useRef(false);
  useFrame(() => {
    const group = ref.current;
    if (!group || pinnedRef.current) return;
    pinnedRef.current = true;
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      // From the part to the group, through the groups in between.
      const rest = new THREE.Matrix4();
      let node: THREE.Object3D | null = object;
      while (node && node !== group) {
        node.updateMatrix();
        rest.premultiply(node.matrix);
        node = node.parent;
      }
      const materials: THREE.Material[] = [object.material].flat();
      materials.forEach((material) => {
        if (isSnowy(material)) pinSnow(material, rest);
      });
    });
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

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
  const snow = use(SnowContext);
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
        {...(snow && snowy)}
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
  const snow = use(SnowContext);
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[top, radius, height, segments]} />
      <meshStandardMaterial
        {...(snow && snowy)}
        color={color}
        roughness={0.75}
      />
    </mesh>
  );
}

// A group popping in with `pop`, scaled from `feet`.
export function Pop({
  feet,
  pop,
  children,
}: {
  feet: Vec3;
  pop: SpringValue<number>;
  children: ReactNode;
}) {
  return (
    <animated.group position={feet} scale={pop}>
      <group position={[-feet[0], -feet[1], -feet[2]]}>{children}</group>
    </animated.group>
  );
}

// House-shaped section (walls and gables in one), `depth` across x and
// centred on it, from y = 0 to the ridge, extruded along z (`length`,
// centred) with a rounded `bevel`, which grows it outward by as much all
// round.
export function useHouseGeometry({
  depth,
  length,
  wall,
  pitch,
  bevel,
}: {
  depth: number;
  length: number;
  wall: number;
  pitch: number;
  bevel: number;
}) {
  return useMemo(() => {
    const half = depth / 2;
    const ridge = wall + half * Math.tan(pitch);
    const shape = new THREE.Shape()
      .moveTo(-half, 0)
      .lineTo(half, 0)
      .lineTo(half, wall)
      .lineTo(0, ridge)
      .lineTo(-half, wall)
      .closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: length - 2 * bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
    });
    geometry.translate(0, 0, -(length - 2 * bevel) / 2);
    return geometry;
  }, [depth, length, wall, pitch, bevel]);
}

// Window glass, lit from inside (glowing by `glow`) or not.
export function glass(lit: boolean, glow = 1.1) {
  return lit
    ? { color: STATION_COLORS.light, emissive: glow }
    : { color: STATION_COLORS.glassOff, emissive: 0 };
}

// A window in a front wall, facing the track (-x): frame, glass, mullions
// and a sill.
export function Window({
  position,
  lit,
  glow,
  frame = STATION_COLORS.wood,
}: {
  position: Vec3;
  lit: boolean;
  glow?: number;
  frame?: string;
}) {
  return (
    <group position={position}>
      <Block size={[0.3, 2.2, 1.9]} radius={0.12} color={frame} />
      <Block
        size={[0.2, 1.8, 1.5]}
        position={[-0.08, 0, 0]}
        radius={0.08}
        {...glass(lit, glow)}
      />
      {/* Mullions */}
      <Block
        size={[0.12, 1.8, 0.1]}
        position={[-0.2, 0, 0]}
        radius={0.04}
        color={frame}
      />
      <Block
        size={[0.12, 0.1, 1.5]}
        position={[-0.2, 0.2, 0]}
        radius={0.04}
        color={frame}
      />
      {/* Sill */}
      <Block
        size={[0.6, 0.15, 2.2]}
        position={[-0.2, -1.15, 0]}
        radius={0.06}
        color={STATION_COLORS.sign}
      />
    </group>
  );
}

// A row of little flowers along a window box, their colours and heights
// varied by `seed`.
function Flowers({
  count,
  spread,
  y,
  seed,
}: {
  count: number;
  spread: number;
  y: number;
  seed: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const t = count === 1 ? 0 : i / (count - 1) - 0.5;
        const color = FLOWER_COLORS[(i + seed) % FLOWER_COLORS.length];
        return (
          <mesh
            key={i}
            position={[
              ((i + seed) % 3) * 0.08 - 0.08,
              y + ((i * 7 + seed) % 3) * 0.06,
              t * spread,
            ]}
            castShadow
          >
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial {...snowy} color={color} roughness={0.6} />
          </mesh>
        );
      })}
    </>
  );
}

// A flowered window box, under a Window.
export function WindowBox({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Block
        size={[0.7, 0.45, 1.9]}
        radius={0.12}
        color={STATION_COLORS.wood}
      />
      <mesh position={[0, 0.3, 0]} scale={[0.5, 0.35, 1.6]} castShadow>
        <sphereGeometry args={[0.6, 14, 10]} />
        <meshStandardMaterial
          {...snowy}
          color={STATION_COLORS.bush}
          roughness={0.8}
        />
      </mesh>
      <Flowers count={5} spread={1.5} y={0.45} seed={position[2] > 0 ? 1 : 0} />
    </group>
  );
}
