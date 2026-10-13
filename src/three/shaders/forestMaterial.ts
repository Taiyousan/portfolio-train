import * as THREE from "three";
import { AUTUMN_LEAVES } from "../config/seasons";
import { addSnow } from "./snow";

// How far the leaves have turned, 0 → 1, for both materials (see
// setAutumn), and the colours they turn to.
const autumn = { value: 0 };
const autumnColors = {
  value: AUTUMN_LEAVES.map((color) => new THREE.Color(color)),
};

// Materials shared by the forest's props, whose geometries carry their own
// colours: a `color` attribute, and an `aTint` one (1 where the part takes
// its instance's colour: crowns, bushes, rocks; 2 where that turns in
// autumn: leaves, grass; 0 where it keeps its own).
//
// In autumn, each prop's leaves turn to one of the autumn colours, picked
// from its instance's index, a few staying green.
//
// Snow settles on whatever faces up (see shaders/snow). The "withering"
// material's props (grass, flowers, reeds) flatten into the ground instead
// as it grows; they cast no shadow, the depth pass doesn't flatten them.
export function createForestMaterials() {
  const create = (wither: boolean) => {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uAutumn = autumn;
      shader.uniforms.uAutumnColors = autumnColors;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
attribute float aTint;
uniform float uSnow;
uniform float uAutumn;
uniform vec3 uAutumnColors[${AUTUMN_LEAVES.length}];

vec3 autumnLeaves(vec3 green) {
  float pick = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453);
  int index = int(pick * ${AUTUMN_LEAVES.length + 1}.0);
  return index < ${AUTUMN_LEAVES.length} ? uAutumnColors[index] : green;
}`,
        )
        .replace(
          "#include <color_vertex>",
          `vColor = vec4(color, 1.0);
#ifdef USE_INSTANCING_COLOR
  vec3 tint = instanceColor.rgb;
  if (aTint > 1.5) tint = mix(tint, autumnLeaves(tint), uAutumn);
  vColor.rgb *= mix(vec3(1.0), tint, min(aTint, 1.0));
#endif`,
        )
        .replace(
          "#include <begin_vertex>",
          wither
            ? `#include <begin_vertex>
transformed.y = transformed.y * (1.0 - uSnow) - 0.06 * uSnow;`
            : "#include <begin_vertex>",
        );
      addSnow(shader);
    };
    // The same onBeforeCompile source for both: tell three's program cache
    // they differ.
    material.customProgramCacheKey = () =>
      wither ? "forest-wither" : "forest";
    return material;
  };

  const solid = create(false);
  const withering = create(true);

  return {
    solid,
    withering,
    // The season's tint over everything (white in summer).
    setTint(color: THREE.Color) {
      solid.color.copy(color);
      withering.color.copy(color);
    },
    // How far the leaves have turned, 0 → 1.
    setAutumn(value: number) {
      autumn.value = value;
    },
    dispose() {
      solid.dispose();
      withering.dispose();
    },
  };
}

export type ForestMaterials = ReturnType<typeof createForestMaterials>;
