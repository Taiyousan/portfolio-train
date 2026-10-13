import { useMemo } from "react";
import { animated } from "@react-spring/three";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import usePopIn from "../hooks/usePopIn";
import useScrollingLoop from "../hooks/useScrollingLoop";
import { RAIL_TILE_LENGTH } from "../config/scene";
import { GAUGE_X, RAIL_TOP } from "./Locomotive";

const TILE_COUNT = 10;
const SLEEPERS_PER_TILE = 50;
const SLEEPER = { width: 0.69, height: 0.042, depth: 0.1 };
const SLEEPER_COLOR = "#1e0400";

// A rail's cross-section, bottom to top: foot, web, head.
const RAIL = { wide: 0.0176, narrow: 0.0116, foot: 0.0046, web: 0.0033 };
const RAIL_HEIGHT = 0.0143;
// Past the sleepers' loop at both ends, out of sight in the fog.
const RAIL_LENGTH = (TILE_COUNT + 1) * RAIL_TILE_LENGTH;

// One tile's sleepers, merged: a single mesh per tile.
function sleepersGeometry() {
  const pitch = RAIL_TILE_LENGTH / SLEEPERS_PER_TILE;
  return mergeGeometries(
    Array.from({ length: SLEEPERS_PER_TILE }, (_, i) =>
      new THREE.BoxGeometry(
        SLEEPER.width,
        SLEEPER.height,
        SLEEPER.depth,
      ).translate(0, 0, (i + 0.5) * pitch - RAIL_TILE_LENGTH / 2),
    ),
  );
}

// A rail, its profile extruded along z, from the foot's underside up.
function railGeometry() {
  const { wide, narrow, foot, web } = RAIL;
  const w = wide / 2;
  const n = narrow / 2;
  const shape = new THREE.Shape(
    [
      [-w, 0],
      [w, 0],
      [w, foot],
      [n, foot],
      [n, foot + web],
      [w, foot + web],
      [w, RAIL_HEIGHT],
      [-w, RAIL_HEIGHT],
      [-w, foot + web],
      [-n, foot + web],
      [-n, foot],
      [-w, foot],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
  );
  return new THREE.ExtrudeGeometry(shape, {
    depth: RAIL_LENGTH,
    bevelEnabled: false,
  }).translate(0, 0, -RAIL_LENGTH / 2);
}

// The endless track, its rail heads at RAIL_TOP under the wheels. A rail
// is the same all along, so only the sleepers scroll (see
// useScrollingLoop); the rails stay put.
export default function Rails() {
  const tiles = useScrollingLoop(TILE_COUNT, RAIL_TILE_LENGTH);
  const scale = usePopIn();
  const { sleepers, rail, sleeperMaterial, railMaterial } = useMemo(
    () => ({
      sleepers: sleepersGeometry(),
      rail: railGeometry(),
      sleeperMaterial: new THREE.MeshStandardMaterial({
        color: SLEEPER_COLOR,
        roughness: 1,
      }),
      // Polished steel, coloured by the sky it reflects.
      railMaterial: new THREE.MeshStandardMaterial({
        metalness: 1,
        roughness: 1 / 3,
      }),
    }),
    [],
  );

  return (
    // Popped in from the rail heads' height, so it doesn't rise as it grows.
    <group position-y={RAIL_TOP}>
      <animated.group scale={scale}>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={rail}
            material={railMaterial}
            position={[side * GAUGE_X, -RAIL_HEIGHT, 0]}
          />
        ))}
        {tiles.map(({ ref, position }, index) => (
          <group key={index} ref={ref} position={position}>
            <mesh
              geometry={sleepers}
              material={sleeperMaterial}
              position-y={-RAIL_HEIGHT - SLEEPER.height / 2}
            />
          </group>
        ))}
      </animated.group>
    </group>
  );
}
