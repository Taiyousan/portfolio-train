import { type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTrainContext, type SeasonWeights } from "../state/TrainContext";
import {
  SEASONS,
  SEASON_LOOKS,
  type Season,
  type SeasonColor,
  type SeasonValue,
} from "../config/seasons";
import { setSnowCover } from "../shaders/snow";
import useReducedMotion from "./useReducedMotion";

// How fast the scene blends into a newly picked season (damp rate, ~1.5 s).
const SEASON_BLEND_RATE = 3;

// Parsed on first use.
const parsedColors = new Map<string, THREE.Color>();

function seasonColor(season: Season, key: SeasonColor) {
  const id = `${season}:${key}`;
  let color = parsedColors.get(id);
  if (!color) {
    color = new THREE.Color(SEASON_LOOKS[season].colors[key]);
    parsedColors.set(id, color);
  }
  return color;
}

// Each season's colour, weighted by how far the scene has blended into it.
export function mixColor(
  weights: SeasonWeights,
  key: SeasonColor,
  out: THREE.Color,
) {
  out.setRGB(0, 0, 0);
  for (const season of SEASONS) {
    const weight = weights[season];
    if (weight === 0) continue;
    const color = seasonColor(season, key);
    out.r += color.r * weight;
    out.g += color.g * weight;
    out.b += color.b * weight;
  }
  return out;
}

export function mixValue(weights: SeasonWeights, key: SeasonValue) {
  let value = 0;
  for (const season of SEASONS) {
    value += SEASON_LOOKS[season].values[key] * weights[season];
  }
  return value;
}

// Keeps a material's (or light's, or fog's) colour on the blended season.
export function useSeasonColor(
  ref: RefObject<{ color: THREE.Color } | null>,
  key: SeasonColor,
) {
  const { seasonWeightsRef } = useTrainContext();
  useFrame(() => {
    if (ref.current) mixColor(seasonWeightsRef.current, key, ref.current.color);
  });
}

// Hands the blended season value to `apply`, every frame.
export function useSeasonValue(
  key: SeasonValue,
  apply: (value: number) => void,
) {
  const { seasonWeightsRef } = useTrainContext();
  useFrame(() => apply(mixValue(seasonWeightsRef.current, key)));
}

// Eases every season's weight toward 1 for the picked season, 0 for the
// others: the same damping on each keeps them summing to 1, so a switch
// mid-blend carries on from where it is. Instant with reduced motion. Then
// hands the blended snow cover to the materials (see shaders/snow). Mount
// once inside the Canvas.
export function useSeasonEasing() {
  const { season, seasonWeightsRef } = useTrainContext();
  const reducedMotion = useReducedMotion();

  useFrame((_, delta) => {
    const weights = seasonWeightsRef.current;
    for (const other of SEASONS) {
      const target = other === season ? 1 : 0;
      const next = reducedMotion
        ? target
        : THREE.MathUtils.damp(
            weights[other],
            target,
            SEASON_BLEND_RATE,
            delta,
          );
      weights[other] = Math.abs(next - target) < 0.001 ? target : next;
    }
    setSnowCover(mixValue(weights, "snow"));
  });
}
