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

// For a MeshStandardMaterial's onBeforeCompile.
export function addSnow(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.uSnow = snow;
  shader.uniforms.uSnowColor = snowColor;
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
varying vec3 vSnowPosition;`,
    )
    .replace(
      "#include <project_vertex>",
      `#include <project_vertex>
// Where on the object, in world units and directions but from its own
// origin, so that the wavy edge stays put on it however it moves: the
// stops arriving, the forest scrolling (its instances in their tile's
// frame).
vec4 snowPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  snowPosition = instanceMatrix * snowPosition;
#endif
vSnowPosition = mat3(modelMatrix) * snowPosition.xyz;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
uniform float uSnow;
uniform vec3 uSnowColor;
varying vec3 vSnowPosition;`,
    )
    .replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
// How far the face turns up in the world (normal is in view space, the
// world's up there is the view matrix's second column). Past 1 (no face
// that steep) without snow, down to faces well off the vertical with it
// all.
float snowUp = dot(normal, viewMatrix[1].xyz);
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
