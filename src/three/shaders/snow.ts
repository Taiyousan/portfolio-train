import * as THREE from "three";
import { SNOW_COLOR } from "../config/seasons";

// Snow settling on whatever faces up, shared by every material that takes
// it: the forest's (see forestMaterial), and the stops' and the train's
// (see `snowy`). More of their faces turn white as the season's snow cover
// grows, down to faces well off the vertical with it all, with a wavy
// edge. One uniform for the whole scene, set once per frame (see
// useSeasonEasing).
const snow = { value: 0 };
const snowColor = { value: new THREE.Color(SNOW_COLOR) };

// 0 → 1: from no snow to full cover.
export function setSnowCover(value: number) {
  snow.value = value;
}

// A material's snow pinned to its object (see pinSnow), or not: its frame
// at rest (from the object to an upright one), and the world's up then, in
// the object's frame.
type SnowPin = {
  uSnowPinned: { value: number };
  uSnowRest: { value: THREE.Matrix3 };
  uSnowUp: { value: THREE.Vector3 };
};

const createPin = (): SnowPin => ({
  uSnowPinned: { value: 0 },
  uSnowRest: { value: new THREE.Matrix3() },
  uSnowUp: { value: new THREE.Vector3(0, 1, 0) },
});

// Per material, made by whichever comes first, its compiling or its
// pinning; shared by the materials of their own (the forest's), never
// pinned.
const pins = new WeakMap<THREE.Material, SnowPin>();
const unpinned = createPin();

function getPin(material: THREE.Material) {
  let pin = pins.get(material);
  if (!pin) {
    pin = createPin();
    pins.set(material, pin);
  }
  return pin;
}

// For a MeshStandardMaterial's onBeforeCompile, which three calls on the
// material (`this`); or called from a material's own.
export function addSnow(
  this: THREE.Material | void,
  shader: THREE.WebGLProgramParametersWithUniforms,
) {
  shader.uniforms.uSnow = snow;
  shader.uniforms.uSnowColor = snowColor;
  Object.assign(
    shader.uniforms,
    this instanceof THREE.Material ? getPin(this) : unpinned,
  );
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
uniform float uSnowPinned;
uniform mat3 uSnowRest;
uniform vec3 uSnowUp;
varying vec3 vSnowPosition;
varying vec3 vSnowUp;`,
    )
    .replace(
      "#include <project_vertex>",
      `#include <project_vertex>
// Where on the object, in world units and directions but from its own
// origin, so that the wavy edge stays put on it however it moves: the
// stops arriving, the forest scrolling (its instances in their tile's
// frame). And the world's up, in view space. Pinned, both as they were at
// rest, turning with the object since.
vec4 snowPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  snowPosition = instanceMatrix * snowPosition;
#endif
if (uSnowPinned > 0.5) {
  vSnowPosition = uSnowRest * snowPosition.xyz;
  vSnowUp = mat3(modelViewMatrix) * uSnowUp;
} else {
  vSnowPosition = mat3(modelMatrix) * snowPosition.xyz;
  vSnowUp = viewMatrix[1].xyz;
}`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
uniform float uSnow;
uniform vec3 uSnowColor;
varying vec3 vSnowPosition;
varying vec3 vSnowUp;`,
    )
    .replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
// How far the face turns up (normal is in view space, and so is the up
// the vertex shader hands over). Past 1 (no face that steep) without snow,
// down to faces well off the vertical with it all.
float snowUp = dot(normal, normalize(vSnowUp));
float snowEdge = mix(1.15, 0.3, uSnow)
  + 0.07 * sin(vSnowPosition.x * 9.0) * sin(vSnowPosition.z * 7.0);
float snowMask = smoothstep(snowEdge - 0.05, snowEdge + 0.05, snowUp);
diffuseColor.rgb = mix(diffuseColor.rgb, uSnowColor, snowMask);
roughnessFactor = mix(roughnessFactor, 0.9, snowMask);
metalnessFactor = mix(metalnessFactor, 0.0, snowMask);
totalEmissiveRadiance *= 1.0 - snowMask;`,
    );
}

// Spread on a <meshStandardMaterial> for it to take the snow.
export const snowy = {
  onBeforeCompile: addSnow,
  customProgramCacheKey: () => "snow",
};

export function isSnowy(material: THREE.Material) {
  return material.onBeforeCompile === addSnow;
}

// Pins `material`'s snow to its object, one that moves (tips over, swings
// open): the faces that turn up at rest keep their snow as it moves, rather
// than it sliding onto whatever faces up then. `rest` takes the object to
// an upright frame, where it is at rest.
export function pinSnow(material: THREE.Material, rest: THREE.Matrix4) {
  const pin = getPin(material);
  pin.uSnowPinned.value = 1;
  pin.uSnowRest.value.setFromMatrix4(rest);
  pin.uSnowUp.value
    .set(0, 1, 0)
    .applyMatrix3(pin.uSnowRest.value.clone().invert())
    .normalize();
}
