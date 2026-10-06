import { useSyncExternalStore } from "react";

let supported: boolean | undefined;

// Support doesn't change while the page is open.
function subscribe() {
  return () => {};
}

// three.js only renders through WebGL 2. Probed once, then the context is
// let go so it doesn't count against the browser's limit.
function hasWebGL2() {
  if (supported === undefined) {
    const gl = document.createElement("canvas").getContext("webgl2");
    supported = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return supported;
}

// False when the browser can't draw the scene (no WebGL 2, or turned off).
// Assumed true during server rendering, so the loading screen is in the
// HTML.
export default function useWebGLSupport() {
  return useSyncExternalStore(subscribe, hasWebGL2, () => true);
}
