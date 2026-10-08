import * as THREE from "three";
import { SNOW_COLOR } from "../config/seasons";

// Falling snowflakes as points, moved by the shader from their place in a
// box: falling at their own speed, swaying, and carried back along -z as
// the world scrolls (uScroll), wrapping round inside the box.

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>

  uniform float uTime;
  uniform float uScroll;
  uniform float uSize;
  // Pixels per world unit at a distance of 1 (see Snowfall).
  uniform float uScale;
  uniform vec3 uBox;

  attribute float aSeed;

  void main() {
    vec3 p = position;
    p.y -= uTime * (0.25 + 0.25 * aSeed);
    p.z -= uScroll;
    p.x += sin(uTime * (0.5 + aSeed) + aSeed * 6.2832) * 0.12;
    p = mod(p + 0.5 * uBox, uBox) - 0.5 * uBox;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uSize * (0.6 + 0.8 * aSeed) * uScale / -mvPosition.z;

    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <fog_pars_fragment>

  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    // Soft round flake.
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.15, d) * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);

    #include <fog_fragment>
  }
`;

// Flakes scattered at random in a box of size `box` centred on the origin,
// each with a seed for its own speed, sway and size.
export function createSnowfallGeometry(count: number, box: THREE.Vector3) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * box.x;
    positions[i * 3 + 1] = (Math.random() - 0.5) * box.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * box.z;
    seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  return geometry;
}

export function createSnowfallMaterial(box: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uSize: { value: 0.025 },
      uScale: { value: 1 },
      uBox: { value: box },
      uColor: { value: new THREE.Color(SNOW_COLOR) },
      uOpacity: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
}

// Advances the flakes by `delta` seconds, the world having scrolled
// `scrolled` units meanwhile. `scale`: pixels per world unit at a distance
// of 1, for the flakes' size.
export function updateSnowfall(
  material: THREE.ShaderMaterial,
  {
    delta,
    scrolled,
    opacity,
    scale,
  }: { delta: number; scrolled: number; opacity: number; scale: number },
) {
  const { uniforms } = material;
  const box: THREE.Vector3 = uniforms.uBox.value;
  uniforms.uOpacity.value = opacity;
  uniforms.uTime.value += delta;
  uniforms.uScroll.value = (uniforms.uScroll.value + scrolled) % box.z;
  uniforms.uScale.value = scale;
}
