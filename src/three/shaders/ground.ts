import * as THREE from "three";
import { RAIL_TILE_LENGTH } from "../config/scene";
import { addSnow } from "./snow";

// Patterns on the ground and the ballast (see ForestFloor, Rails), drawn in
// world units and slid along z by how far the world has scrolled, so they
// ride with the forest though their meshes stay put. The noise loops every
// TRAVEL_PERIOD along z, so the distance wraps there and keeps its float
// precision however long the ride.
const TRAVEL_PERIOD = 8 * RAIL_TILE_LENGTH;
const travel = { value: 0 };

// Called once a frame, with the distance the world scrolled.
export function advanceTravel(distance: number) {
  travel.value = (travel.value + distance) % TRAVEL_PERIOD;
}

// The season's share of the ground (see ForestFloor): drier patches'
// colour, puddles' colour, then 0 → 1, puddles.
const patchColor = { value: new THREE.Color() };
const puddleColor = { value: new THREE.Color() };
const rain = { value: 0 };

export const groundSeason = {
  patchColor: patchColor.value,
  puddleColor: puddleColor.value,
  setRain(value: number) {
    rain.value = value;
  },
};

// Smooth value noise over the ground, in `cell`-sized cells (a divisor of
// TRAVEL_PERIOD), looping along z with the travel.
const NOISE = `uniform float uTravel;
varying vec2 vGround;

float groundHash(vec2 cell) {
  return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
}

float groundNoise(float cell) {
  vec2 p = vec2(vGround.x, vGround.y + uTravel) / cell;
  float period = floor(${TRAVEL_PERIOD.toFixed(1)} / cell + 0.5);
  vec2 c = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float z0 = mod(c.y, period);
  float z1 = mod(c.y + 1.0, period);
  return mix(
    mix(groundHash(vec2(c.x, z0)), groundHash(vec2(c.x + 1.0, z0)), f.x),
    mix(groundHash(vec2(c.x, z1)), groundHash(vec2(c.x + 1.0, z1)), f.x),
    f.y
  );
}`;

function addNoise(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.uTravel = travel;
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
varying vec2 vGround;`,
    )
    .replace(
      "#include <project_vertex>",
      `#include <project_vertex>
vGround = (modelMatrix * vec4(transformed, 1.0)).xz;`,
    );
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <common>",
    `#include <common>
${NOISE}`,
  );
}

// The forest floor, its colour the season's: broad, soft shifts toward a
// drier shade, then puddles in the rain, spreading as it comes in.
function addGround(shader: THREE.WebGLProgramParametersWithUniforms) {
  addNoise(shader);
  Object.assign(shader.uniforms, {
    uPatchColor: patchColor,
    uPuddleColor: puddleColor,
    uRain: rain,
  });
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
uniform vec3 uPatchColor;
uniform vec3 uPuddleColor;
uniform float uRain;`,
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
float patches = 0.7 * groundNoise(5.0) + 0.3 * groundNoise(1.25);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  uPatchColor,
  smoothstep(0.3, 0.75, patches)
);
float wet = 0.7 * groundNoise(2.5) + 0.3 * groundNoise(0.5);
float puddle = step(0.001, uRain)
  * smoothstep(0.0, 0.02, wet - (0.8 - 0.14 * uRain));
diffuseColor.rgb = mix(diffuseColor.rgb, uPuddleColor, puddle);`,
    )
    .replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.8, puddle);`,
    );
}

// Spread on the floor's <meshStandardMaterial>.
export const groundPattern = {
  onBeforeCompile: addGround,
  customProgramCacheKey: () => "ground",
};

// The ballast: a gravel grain, darker when wet, and snow on top.
function addGravel(shader: THREE.WebGLProgramParametersWithUniforms) {
  addNoise(shader);
  shader.uniforms.uRain = rain;
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
uniform float uRain;`,
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
float grain = 0.6 * groundNoise(0.05) + 0.4 * groundNoise(0.1);
diffuseColor.rgb *= (0.7 + 0.6 * grain) * (1.0 - 0.35 * uRain);`,
    );
  addSnow(shader);
}

export function createGravelMaterial(color: THREE.ColorRepresentation) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 1 });
  material.onBeforeCompile = addGravel;
  material.customProgramCacheKey = () => "gravel";
  return material;
}
