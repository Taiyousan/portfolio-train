import * as THREE from "three";
import { SNOW_COLOR } from "../config/seasons";

// Snow cap on a pine's foliage cone (see Forest). The cap geometry has its
// tip at the origin; the shader scales it by uGrow and moves it onto the
// cone's tip (uApex), so the snow grows down from the top of every tree at
// once as the season's snow cover rises, with a single uniform. The apex is
// a uniform, not baked into the shader: three caches programs by the
// onBeforeCompile source, which is the same for every cap.
export function createSnowCapMaterial(apexY: number) {
  const grow = { value: 0 };
  const apex = { value: new THREE.Vector3(0, apexY, 0) };
  const material = new THREE.MeshStandardMaterial({
    color: SNOW_COLOR,
    roughness: 0.9,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrow = grow;
    shader.uniforms.uApex = apex;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uGrow;\nuniform vec3 uApex;",
      )
      .replace(
        "#include <begin_vertex>",
        "vec3 transformed = position * uGrow + uApex;",
      );
  };
  // 0 → 1: from no snow to the full cap.
  const setGrow = (value: number) => {
    grow.value = value;
  };
  return { material, setGrow };
}
