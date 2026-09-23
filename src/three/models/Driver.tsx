import type { ThreeElements } from "@react-three/fiber";

// A small stylized driver figure standing in the locomotive cab.
export default function Driver(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      {/* legs */}
      <mesh castShadow position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 0.32, 10]} />
        <meshStandardMaterial color="#2b3a5c" roughness={0.8} />
      </mesh>

      {/* torso */}
      <mesh castShadow position={[0, 0.46, 0]}>
        <capsuleGeometry args={[0.15, 0.3, 4, 10]} />
        <meshStandardMaterial color="#3d5a8a" roughness={0.75} />
      </mesh>

      {/* arms */}
      <mesh castShadow position={[0.19, 0.5, 0.06]} rotation={[0.4, 0, -0.3]}>
        <capsuleGeometry args={[0.05, 0.26, 4, 8]} />
        <meshStandardMaterial color="#3d5a8a" roughness={0.75} />
      </mesh>
      <mesh castShadow position={[-0.19, 0.5, 0.06]} rotation={[0.4, 0, 0.3]}>
        <capsuleGeometry args={[0.05, 0.26, 4, 8]} />
        <meshStandardMaterial color="#3d5a8a" roughness={0.75} />
      </mesh>

      {/* head */}
      <mesh castShadow position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#e2b48c" roughness={0.9} />
      </mesh>

      {/* cap */}
      <mesh castShadow position={[0, 0.89, 0]}>
        <cylinderGeometry args={[0.145, 0.145, 0.1, 12]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.845, 0.13]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
    </group>
  );
}
