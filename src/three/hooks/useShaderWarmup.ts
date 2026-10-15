import { useLayoutEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// Draws, while the scene loads, everything the stops will bring into view,
// so that arriving at one doesn't freeze the frame it first appears on.
//
// The stops start hidden, their lamps' point lights too, and every lit
// shader is built for the number of point lights in view: the first
// arrival would rebuild every lit material in the scene. Hence one pass per
// combination of stops that can be in view: none, each alone, and both (one
// scrolling away as the train heads to the other).
//
// Every pass is compiled first, then drawn. Compiling doesn't wait for the
// shaders, so the browser builds them in parallel; drawing waits for them,
// and finishes them on Chrome for Windows (ANGLE, over Direct3D), which only
// does so the first time a shader is drawn with. Drawn with frustum culling
// off, so what's out of shot is drawn too, and into a render target like
// the effect composer's (drawing to the screen builds other shaders, which
// the scene never uses).
// compile() takes in hidden objects too: `left` is taken out of the scene
// meanwhile.
function compileWithout(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  left: THREE.Object3D[],
) {
  const children = scene.children;
  scene.children = children.filter((child) => !left.includes(child));
  gl.compile(scene, camera);
  scene.children = children;
}

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
    const passes = [[], ...stops.map((stop) => [stop]), stops];
    const show = (shown: THREE.Group[]) => {
      for (const stop of stops) stop.visible = shown.includes(stop);
    };
    for (const shown of passes) {
      show(shown);
      compileWithout(
        gl,
        scene,
        camera,
        stops.filter((stop) => !shown.includes(stop)),
      );
    }
    for (const shown of passes) {
      show(shown);
      gl.render(scene, camera);
    }
    gl.setRenderTarget(previousTarget);
    target.dispose();

    for (const object of culled) object.frustumCulled = true;
    stops.forEach((stop, i) => (stop.visible = wasVisible[i]));
    for (const object of hidden) object.visible = false;
  }, [gl, scene, camera, stationRef, homeRef]);
}
