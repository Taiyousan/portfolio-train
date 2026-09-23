import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function hasDebugHash() {
  return window.location.hash.includes("debug");
}

// True when the URL has "#debug" (or "#debug&..."). Reactive to hash
// changes so toggling it doesn't require a full page reload. Always false
// during server rendering, where there is no URL hash.
export default function useDebugMode() {
  return useSyncExternalStore(subscribe, hasDebugHash, () => false);
}
