import * as THREE from "three";
import { SNOW_COLOR } from "../config/seasons";

// Materials shared by the forest's props (see Forest and forestShapes),
// whose geometries carry their own colours: a `color` attribute, and an
// `aTint` one (1 where the part takes its instance's colour, the crowns,
// bushes and rocks; 0 where it keeps its own, trunks, flowers...).
//
// Snow settles on whatever faces up, more of it as the season's snow cover
// grows, with a wavy edge: one uniform covers every tree, bush and rock at
// once, whatever its shape. "wither" props (grass, flowers, mushrooms,
// reeds) flatten into the ground instead as it grows, so nothing blooms
// in the snow; they cast no shadow, the depth pass doesn't flatten them.
export function createForestMaterials() {
  const snow = { value: 0 };
  const snowColor = { value: new THREE.Color(SNOW_COLOR) };

  const create = (wither: boolean) => {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uSnow = snow;
      shader.uniforms.uSnowColor = snowColor;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
attribute float aTint;
uniform float uSnow;
varying float vSnowUp;
varying vec2 vSnowXZ;`,
        )
        .replace(
          "#include <color_vertex>",
          `vColor = vec4(color, 1.0);
#ifdef USE_INSTANCING_COLOR
  vColor.rgb *= mix(vec3(1.0), instanceColor.rgb, aTint);
#endif`,
        )
        .replace(
          "#include <begin_vertex>",
          wither
            ? `#include <begin_vertex>
transformed.y = transformed.y * (1.0 - uSnow) - 0.06 * uSnow;`
            : "#include <begin_vertex>",
        )
        .replace(
          "#include <project_vertex>",
          `#include <project_vertex>
// Instances are only turned about y and scaled evenly, so their matrix
// turns normals as it does positions. In the tile's frame, not the world's:
// the snow's wavy edge stays put on each prop as the forest scrolls.
vec4 snowPosition = vec4(transformed, 1.0);
vec3 snowNormal = objectNormal;
#ifdef USE_INSTANCING
  snowPosition = instanceMatrix * snowPosition;
  snowNormal = mat3(instanceMatrix) * snowNormal;
#endif
vSnowUp = normalize(mat3(modelMatrix) * snowNormal).y;
vSnowXZ = snowPosition.xz;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform float uSnow;
uniform vec3 uSnowColor;
varying float vSnowUp;
varying vec2 vSnowXZ;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
// Past 1 (no face that steep) without snow, down to faces well off the
// vertical with it all.
float snowEdge = mix(1.15, 0.3, uSnow)
  + 0.07 * sin(vSnowXZ.x * 9.0) * sin(vSnowXZ.y * 7.0);
float snowMask = smoothstep(snowEdge - 0.05, snowEdge + 0.05, vSnowUp);
diffuseColor.rgb = mix(diffuseColor.rgb, uSnowColor, snowMask);`,
        );
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
    // 0 → 1: from no snow to full cover.
    setSnow(value: number) {
      snow.value = value;
    },
    // The season's tint over everything (white in summer).
    setTint(color: THREE.Color) {
      solid.color.copy(color);
      withering.color.copy(color);
    },
    dispose() {
      solid.dispose();
      withering.dispose();
    },
  };
}

export type ForestMaterials = ReturnType<typeof createForestMaterials>;
