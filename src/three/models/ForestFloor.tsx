import type { ThreeElements } from "@react-three/fiber";

// Static placeholder ground under the forest so the trees don't float.
// Large enough to stay under the tree tiles at all times; doesn't need to
// scroll since it's a uniform color with no visible seams.
export default function ForestFloor(props: ThreeElements["mesh"]) {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow {...props}>
      <planeGeometry args={[90, 320]} />
      <meshStandardMaterial color="#1c2b16" roughness={1} />
    </mesh>
  );
}
