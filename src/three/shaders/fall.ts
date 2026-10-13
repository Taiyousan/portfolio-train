import * as THREE from "three";

// Falling snowflakes, leaves or rain as points, moved by the shader from
// their place in a box: falling at their own speed, swaying (leaves
// turning over too), and carried back along -z as the world scrolls
// (uScroll), wrapping round inside the box. One program for all, set apart
// by their uniforms.

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>

  uniform float uTime;
  uniform float uScroll;
  uniform float uSize;
  // Pixels per world unit at a distance of 1 (see Fall), and the most a
  // point can grow to, passing near the camera.
  uniform float uScale;
  uniform float uMaxSize;
  uniform vec3 uBox;
  uniform float uFall;
  uniform float uSway;
  uniform float uSpin;

  attribute float aSeed;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vAngle;

  void main() {
    vec3 p = position;
    p.y -= uTime * uFall * (1.0 + aSeed);
    p.z -= uScroll;
    p.x += sin(uTime * (0.5 + aSeed) + aSeed * 6.2832) * uSway;
    p = mod(p + 0.5 * uBox, uBox) - 0.5 * uBox;

    vColor = aColor;
    // Each its own way up and pace, if it turns at all (not rain).
    vAngle = uSpin * (aSeed * 6.2832 + uTime * (0.5 + aSeed));

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = min(
      uSize * (0.6 + 0.8 * aSeed) * uScale / -mvPosition.z,
      uMaxSize
    );

    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <fog_pars_fragment>

  uniform float uOpacity;
  // The point's shape: a disc squeezed by uStretch (x, y), turning with
  // vAngle, its edge softened from uEdge out (0.5: sharp).
  uniform vec2 uStretch;
  uniform float uEdge;

  varying vec3 vColor;
  varying float vAngle;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float s = sin(vAngle);
    float k = cos(vAngle);
    c = mat2(k, -s, s, k) * c;
    c *= uStretch;
    float alpha = smoothstep(0.5, uEdge, length(c)) * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);

    #include <fog_fragment>
  }
`;

// How a fall looks and moves: its colours (one per point, at random), and
// its points' size (at most maxSize CSS pixels), shape (see uStretch and
// uEdge), fall speed, sway and turning (none for 0).
export type FallLook = {
  colors: string[];
  size: number;
  maxSize: number;
  stretch: [number, number];
  edge: number;
  fall: number;
  sway: number;
  spin: number;
};

// Points scattered at random in a box of size `box` centred on the origin,
// each with a seed for its own speed, sway and size, and a colour.
export function createFallGeometry(
  count: number,
  box: THREE.Vector3,
  colors: string[],
) {
  const palette = colors.map((color) => new THREE.Color(color));
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const tints = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * box.x;
    positions[i * 3 + 1] = (Math.random() - 0.5) * box.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * box.z;
    seeds[i] = Math.random();
    palette[Math.floor(Math.random() * palette.length)].toArray(tints, i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(tints, 3));
  return geometry;
}

export function createFallMaterial(box: THREE.Vector3, look: FallLook) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uSize: { value: look.size },
      uScale: { value: 1 },
      uMaxSize: { value: look.maxSize },
      uBox: { value: box },
      uFall: { value: look.fall },
      uSway: { value: look.sway },
      uSpin: { value: look.spin },
      uStretch: { value: new THREE.Vector2(...look.stretch) },
      uEdge: { value: look.edge },
      uOpacity: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
}

// Advances the points by `delta` seconds, the world having scrolled
// `scrolled` units meanwhile. `scale`: pixels per world unit at a distance
// of 1, for the points' size; `dpr`, device pixels per CSS pixel.
export function updateFall(
  material: THREE.ShaderMaterial,
  {
    delta,
    scrolled,
    opacity,
    scale,
    dpr,
    maxSize,
  }: {
    delta: number;
    scrolled: number;
    opacity: number;
    scale: number;
    dpr: number;
    maxSize: number;
  },
) {
  const { uniforms } = material;
  const box: THREE.Vector3 = uniforms.uBox.value;
  uniforms.uOpacity.value = opacity;
  uniforms.uTime.value += delta;
  uniforms.uScroll.value = (uniforms.uScroll.value + scrolled) % box.z;
  uniforms.uScale.value = scale;
  uniforms.uMaxSize.value = maxSize * dpr;
}
