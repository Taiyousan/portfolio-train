import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ForestMaterials } from "../shaders/forestMaterial";
import { FLOWER_COLORS } from "./StationPrimitives";
import { FOREST_COLORS, assemble, rock, seededRandom } from "./forestShapes";

// Where a pond lies in its forest tile, and the seed its shape comes from.
export type PondLayout = { x: number; z: number; radius: number; seed: number };

// Radius range of a pond's water; its bank reaches out BANK times as far,
// and its wavy shore up to SHORE times further still.
export const POND_RADIUS: [number, number] = [0.9, 1.4];
export const BANK = 1.25;
export const SHORE = 1.21;

// A small pond in the forest: a muddy bank ringed with pebbles, still
// water, bulrushes and lily pads. In winter the water turns to ice (its
// colour is the season's) and the plants sink away. Centred on the origin.
export default function Pond({
  radius,
  seed,
  materials,
  water,
}: Pick<PondLayout, "radius" | "seed"> & {
  materials: ForestMaterials;
  water: THREE.Material;
}) {
  const geometries = useMemo(
    () => pondGeometries(radius, seed),
    [radius, seed],
  );
  useEffect(
    () => () => Object.values(geometries).forEach((g) => g.dispose()),
    [geometries],
  );

  return (
    <>
      <mesh
        geometry={geometries.solid}
        material={materials.solid}
        receiveShadow
        castShadow
      />
      <mesh geometry={geometries.water} material={water} receiveShadow />
      <mesh
        geometry={geometries.plants}
        material={materials.withering}
        receiveShadow
      />
    </>
  );
}

function pondGeometries(radius: number, seed: number) {
  const random = seededRandom(seed);
  const phase = [random(), random()].map((p) => p * Math.PI * 2);
  // The shore's distance from the centre, all round.
  const shore = (angle: number) =>
    radius *
    (1 +
      (SHORE - 1) *
        ((2 / 3) * Math.sin(2 * angle + phase[0]) +
          (1 / 3) * Math.sin(3 * angle + phase[1])));

  // Flat, facing up, `scale` times the shore, at height `y`.
  const outline = (scale: number, y: number) => {
    const shape = new THREE.Shape();
    const steps = 48;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const r = shore(angle) * scale;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, y, 0);
    return geometry;
  };
  // A point on the ground, at `angle` round and `along` times the shore out.
  const at = (angle: number, along: number) => ({
    x: Math.cos(angle) * shore(angle) * along,
    // The shape's +y turns to -z once laid flat.
    z: -Math.sin(angle) * shore(angle) * along,
  });

  const pebbles = Array.from({ length: 11 }, (_, i) => {
    const angle = (i / 11) * Math.PI * 2 + random() * 0.3;
    const { x, z } = at(angle, 1.05 + random() * 0.12);
    const pebble = rock(0.08 + random() * 0.09, seed + i, 0.6);
    pebble.translate(x, 0, z);
    return {
      geometry: pebble,
      color: new THREE.Color(FOREST_COLORS.pebble).multiplyScalar(
        0.85 + random() * 0.3,
      ),
    };
  });
  const solid = assemble([
    { geometry: outline(BANK, 0.012), color: FOREST_COLORS.bank },
    ...pebbles,
  ]);

  // Bulrushes in a clump on one side, half in the water.
  const clump = random() * Math.PI * 2;
  const reeds = Array.from({ length: 8 }, () => {
    const angle = clump + (random() - 0.5) * 0.7;
    const { x, z } = at(angle, 0.85 + random() * 0.25);
    const height = 0.5 + random() * 0.35;
    const stem = new THREE.CylinderGeometry(0.012, 0.016, height, 6);
    stem.translate(x, height / 2, z);
    const head = new THREE.CylinderGeometry(0.03, 0.032, 0.14, 8);
    head.translate(x, height - 0.16, z);
    const leaf = new THREE.ConeGeometry(0.025, height * 0.7, 4);
    leaf.translate(0, height * 0.35, 0);
    leaf.rotateZ(0.35);
    leaf.rotateY(random() * Math.PI * 2);
    leaf.translate(x, 0, z);
    return [
      { geometry: stem, color: FOREST_COLORS.stem },
      { geometry: head, color: FOREST_COLORS.reedHead },
      { geometry: leaf, color: FOREST_COLORS.leaf },
    ];
  }).flat();

  // Lily pads on the water, away from the bulrushes; the first in flower.
  const pads = Array.from({ length: 3 }, (_, i) => {
    const angle = clump + Math.PI + (i - 1) * 0.9 + random() * 0.3;
    const { x, z } = at(angle, 0.35 + random() * 0.3);
    const size = 0.16 + random() * 0.1;
    const pad = new THREE.CircleGeometry(size, 16, 0.35, Math.PI * 2 - 0.35);
    pad.rotateX(-Math.PI / 2);
    pad.rotateY(random() * Math.PI * 2);
    pad.translate(x, 0.04, z);
    const parts: { geometry: THREE.BufferGeometry; color: string }[] = [
      { geometry: pad, color: FOREST_COLORS.lilyPad },
    ];
    if (i === 0) {
      for (let p = 0; p < 6; p++) {
        const petal = new THREE.SphereGeometry(0.05, 8, 6);
        petal.scale(1.4, 0.5, 0.7);
        petal.translate(0.045, 0, 0);
        petal.rotateY((p / 6) * Math.PI * 2);
        petal.translate(x, 0.07, z);
        parts.push({ geometry: petal, color: FOREST_COLORS.lily });
      }
      const heart = new THREE.SphereGeometry(0.03, 8, 6);
      heart.translate(x, 0.085, z);
      parts.push({ geometry: heart, color: FLOWER_COLORS[1] });
    }
    return parts;
  }).flat();

  return {
    solid,
    water: outline(1, 0.03),
    plants: assemble([...reeds, ...pads]),
  };
}
