import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

// True while the URL has "#debug". False during server rendering.
export default function useDebugMode() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash.includes("debug"),
    () => false,
  );
}
