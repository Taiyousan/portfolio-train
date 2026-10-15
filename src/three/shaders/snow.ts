import * as THREE from "three";
import { SNOW_COLOR } from "../config/seasons";

// Snow settling on whatever faces up, for every material that takes it
// (the forest's, and through `snowy` the stops' and the train's). More
// faces turn white as the snow cover grows, with a wavy edge. One uniform
// for the whole scene, set every frame by useSeasonEasing.
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
// pinning; one shared by the materials that are never pinned (the
// forest's).
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
// Where on the object, in world units but from its own origin, so the wavy
// edge stays put on it however it moves; and the world's up, in view
// space. Pinned, both as they were at rest.
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
// How far the face turns up (both in view space), against an edge from
// past 1 (no face) without snow to well off the vertical with it all.
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

// Pins `material`'s snow to its object, one that tips over or swings open:
// the faces up at rest keep their snow as it moves. `rest` takes the
// object to its upright frame at rest.
export function pinSnow(material: THREE.Material, rest: THREE.Matrix4) {
  const pin = getPin(material);
  pin.uSnowPinned.value = 1;
  pin.uSnowRest.value.setFromMatrix4(rest);
  pin.uSnowUp.value
    .set(0, 1, 0)
    .applyMatrix3(pin.uSnowRest.value.clone().invert())
    .normalize();
}
