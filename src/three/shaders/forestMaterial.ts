import * as THREE from "three";
import { addSnow } from "./snow";

// Materials shared by the forest's props (see Forest and forestShapes),
// whose geometries carry their own colours: a `color` attribute, and an
// `aTint` one (1 where the part takes its instance's colour, the crowns,
// bushes and rocks; 0 where it keeps its own, trunks, flowers...).
//
// Snow settles on whatever faces up, as everywhere (see shaders/snow):
// one uniform covers every tree, bush and rock at once, whatever its
// shape. "wither" props (grass, flowers, mushrooms, reeds) flatten into the
// ground instead as it grows, so nothing blooms in the snow; they cast no
// shadow, the depth pass doesn't flatten them.
export function createForestMaterials() {
  const create = (wither: boolean) => {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
    });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
attribute float aTint;
uniform float uSnow;`,
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
    dispose() {
      solid.dispose();
      withering.dispose();
    },
  };
}

export type ForestMaterials = ReturnType<typeof createForestMaterials>;
