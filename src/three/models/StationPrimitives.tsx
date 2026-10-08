import { createContext, use, useMemo, useRef, type ReactNode } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { animated, type SpringValue } from "@react-spring/three";
import * as THREE from "three";
import { toCreasedNormals } from "three-stdlib";
import { isSnowy, pinSnow, snowy } from "../shaders/snow";

// Rounded building blocks and palette shared by the stops, their props and
// the locomotive. Blocks and cylinders take the snow (see shaders/snow),
// except inside a NoSnow; it's pinned to them inside a PinnedSnow.

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
const PinnedContext = createContext(false);

// Keeps the snow off the blocks and cylinders inside: what's in use or
// warm, what turns, and the characters.
export function NoSnow({ children }: { children: ReactNode }) {
  return <SnowContext value={false}>{children}</SnowContext>;
}

// Pins the snow to the parts inside (see pinSnow), for parts that move:
// what's white at rest stays white as they tip over or swing open. Read on
// the first frame, when they must be at rest and upright.
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
    <PinnedContext value={true}>
      <group ref={ref} position={position}>
        {children}
      </group>
    </PinnedContext>
  );
}

function createMaterial(color: string, snow: boolean, emissive = 0) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    emissive: emissive ? color : "#000000",
    emissiveIntensity: emissive,
  });
  if (snow) Object.assign(material, snowy);
  return material;
}

// The blocks' and cylinders' material, shared by all those alike: hundreds
// of them, but few looks, and every material costs at setup. Their own
// under a PinnedSnow, which pins the snow per material.
const sharedMaterials = new Map<string, THREE.MeshStandardMaterial>();

function PartMaterial({
  color,
  emissive,
}: {
  color: string;
  emissive?: number;
}) {
  const snow = use(SnowContext);
  const pinned = use(PinnedContext);
  const own = useMemo(
    () => (pinned ? createMaterial(color, snow, emissive) : null),
    [pinned, color, snow, emissive],
  );
  const key = `${color}:${snow}:${emissive ?? 0}`;
  let material = own ?? sharedMaterials.get(key);
  if (!material) {
    material = createMaterial(color, snow, emissive);
    sharedMaterials.set(key, material);
  }
  return (
    <primitive
      object={material}
      attach="material"
      dispose={own ? undefined : null}
    />
  );
}

// drei's RoundedBox geometry (smoothness 3), built once per size and
// shared: the scene has hundreds of blocks, many alike, and creasing their
// normals is what slows its setup down the most.
const EPS = 0.00001;
const roundedBoxes = new Map<string, THREE.BufferGeometry>();

function roundedBoxGeometry([width, height, depth]: Vec3, radius: number) {
  const key = `${width}:${height}:${depth}:${radius}`;
  let geometry = roundedBoxes.get(key);
  if (!geometry) {
    const r = radius - EPS;
    const shape = new THREE.Shape();
    shape.absarc(EPS, EPS, EPS, -Math.PI / 2, -Math.PI, true);
    shape.absarc(EPS, height - r * 2, EPS, Math.PI, Math.PI / 2, true);
    shape.absarc(width - r * 2, height - r * 2, EPS, Math.PI / 2, 0, true);
    shape.absarc(width - r * 2, EPS, EPS, 0, -Math.PI / 2, true);
    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: depth - radius * 2,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 1,
      bevelSize: radius - EPS,
      bevelThickness: radius,
      curveSegments: 3,
    });
    extruded.center();
    geometry = toCreasedNormals(extruded, 0.4);
    roundedBoxes.set(key, geometry);
  }
  return geometry;
}

// A mesh on a shared rounded box geometry, `args` its size.
export function RoundedBox({
  args,
  radius,
  children,
  ...props
}: Omit<ThreeElements["mesh"], "args"> & { args: Vec3; radius: number }) {
  return (
    <mesh {...props}>
      <primitive
        object={roundedBoxGeometry(args, radius)}
        attach="geometry"
        dispose={null}
      />
      {children}
    </mesh>
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
  return (
    <RoundedBox
      args={size}
      radius={Math.min(radius, ...size.map((d) => d / 2 - 0.001))}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <PartMaterial color={color} emissive={emissive} />
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
      <PartMaterial color={color} />
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

// House-shaped section (walls and gables in one), `depth` across x, from
// y = 0 to the ridge, extruded along z (`length`), both centred, with a
// rounded `bevel` that grows it outward by as much all round.
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
