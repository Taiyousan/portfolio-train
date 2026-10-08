import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import ScrollingTiles from "./ScrollingTiles";
import { RAIL_TILE_LENGTH } from "../config/scene";

export default function Rails(props: ThreeElements["group"]) {
  return (
    <ScrollingTiles
      modelPath="/models/rails.glb"
      resizeScale={RAIL_TILE_LENGTH}
      tileCount={10}
      {...props}
    />
  );
}

useGLTF.preload("/models/rails.glb");
