import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

// True when the URL has "#debug" (or "#debug&..."), or the `flag` given
// instead. Reactive to hash changes so toggling it doesn't require a full
// page reload. Always false during server rendering, where there is no URL
// hash.
export default function useDebugMode(flag = "debug") {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash.includes(flag),
    () => false,
  );
}
