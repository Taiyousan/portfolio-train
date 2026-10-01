import { useLayoutEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// Draws, while the scene loads, everything the stops will bring into view,
// so that arriving at one doesn't freeze the frame it first appears on.
//
// The stops start hidden, and three.js leaves hidden objects out — their
// lamps' point lights too. Every lit material's shader is built for the
// number of point lights in view, so the first arrival doesn't only need
// the stop's own shaders but new builds of every lit material in the scene
// (forest, train, ground…) for the stop's lights. Hence one pass per
// combination of stops that can be in view: each one alone, and both
// (one scrolling away as the train heads to the other).
//
// Each pass is drawn, not just compiled (renderer.compile): on Windows,
// Chrome runs WebGL on Direct3D through ANGLE, which only finishes a shader
// the first time it's drawn with. Drawn with frustum culling off, so that
// what's out of shot is drawn too, and into a render target like the effect
// composer's: shaders drawing to the screen are a different build (tone
// mapping, output colour space), which the scene never uses.
export default function useShaderWarmup(
  stationRef: RefObject<THREE.Group | null>,
  homeRef: RefObject<THREE.Group | null>,
) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    const stops = [stationRef.current, homeRef.current].filter(
      (stop): stop is THREE.Group => stop !== null,
    );
    const wasVisible = stops.map((stop) => stop.visible);
    // Fittings hidden inside the stops until they pop in are shown too.
    const hidden: THREE.Object3D[] = [];
    for (const stop of stops) {
      stop.traverse((object) => {
        if (object !== stop && !object.visible) {
          hidden.push(object);
          object.visible = true;
        }
      });
    }
    const culled: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (object.frustumCulled) {
        culled.push(object);
        object.frustumCulled = false;
      }
    });

    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 8,
    });
    const previousTarget = gl.getRenderTarget();
    gl.setRenderTarget(target);
    for (const shown of [...stops.map((stop) => [stop]), stops]) {
      for (const stop of stops) stop.visible = shown.includes(stop);
      gl.render(scene, camera);
    }
    gl.setRenderTarget(previousTarget);
    target.dispose();

    for (const object of culled) object.frustumCulled = true;
    stops.forEach((stop, i) => (stop.visible = wasVisible[i]));
    for (const object of hidden) object.visible = false;
  }, [gl, scene, camera, stationRef, homeRef]);
}
