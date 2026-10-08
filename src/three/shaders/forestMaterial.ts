import * as THREE from "three";
import { addSnow } from "./snow";

// Materials shared by the forest's props, whose geometries carry their own
// colours: a `color` attribute, and an `aTint` one (1 where the part takes
// its instance's colour: crowns, bushes, rocks; 0 where it keeps its own).
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
