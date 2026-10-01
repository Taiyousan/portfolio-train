import * as THREE from "three";
import { SUN_POSITION } from "../config/scene";

// Toon-shaded smoke puff, replacing the old NodeToy shader (its React
// binding only supports R3F 8). Same look: hard-stepped sun lighting, a
// sharp specular highlight and a bright fresnel rim. On top of that, the
// sphere is displaced by animated noise so it churns like a puff, and it
// dissolves (noise-driven discard) at the end of its life instead of
// fading out, so it stays opaque and needs no depth sorting.
//
// Made for an InstancedMesh (see models/Smoke): one draw call for every
// puff, each with its own age and noise seed as instanced attributes.

const NOISE = /* glsl */ `
  // Value noise by Inigo Quilez, returns 0 → 1.
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x),
        f.y
      ),
      mix(
        mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x),
        f.y
      ),
      f.z
    );
  }
`;

const vertexShader = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>

  uniform float uTime;
  uniform float uBulge;

  // Per puff: 0 → 1 over its life, and its noise seed.
  attribute float aAge;
  attribute float aSeed;

  varying vec3 vWorldPosition;
  varying vec3 vDirection;
  varying float vAge;
  varying float vSeed;

  ${NOISE}

  void main() {
    vAge = aAge;
    vSeed = aSeed;
    vDirection = normalize(position);
    float bump = noise(vDirection * 2.5 + vec3(aSeed, uTime * 0.8, aSeed * 0.5));
    vec3 transformed = position * (1.0 + uBulge * (bump - 0.5) * 2.0);

    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>

  uniform vec3 uColor;
  uniform vec3 uLightDirection;
  uniform vec3 uLightColor;
  uniform vec3 uAmbientColor;
  uniform vec3 uRimColor;
  uniform float uSpecular;

  varying vec3 vWorldPosition;
  varying vec3 vDirection;
  varying float vAge;
  varying float vSeed;

  ${NOISE}

  void main() {
    // Dissolve over the last part of the puff's life.
    float dissolve = smoothstep(0.55, 1.0, vAge);
    if (noise(vDirection * 4.0 + vSeed * 3.1) < dissolve) discard;

    // Faceted normals from screen-space derivatives: they follow the
    // displaced surface and match the low-poly forest.
    vec3 normal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    if (dot(normal, viewDirection) < 0.0) normal = -normal;

    float light = smoothstep(0.0, 0.05, dot(normal, uLightDirection));
    vec3 color = uColor * (uAmbientColor + uLightColor * light);

    vec3 halfway = normalize(viewDirection + uLightDirection);
    float specular = pow(max(dot(normal, halfway), 0.0), 90.0);
    color += uLightColor * light * smoothstep(0.5, 0.6, specular) * uSpecular;

    float fresnel = 1.0 - max(dot(normal, viewDirection), 0.0);
    color = mix(color, uRimColor, step(0.72, fresnel) * 0.6);

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function createSmokeMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 },
      uBulge: { value: 0.22 },
      uColor: { value: new THREE.Color("#ffffff") },
      uLightDirection: {
        value: new THREE.Vector3(...SUN_POSITION).normalize(),
      },
      uLightColor: { value: new THREE.Color("#ffc890") },
      uAmbientColor: { value: new THREE.Color("#7d86a0") },
      uRimColor: { value: new THREE.Color("#fff3e2") },
      uSpecular: { value: 0.6 },
    },
  });
}
