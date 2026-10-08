"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LIVERY,
  DEFAULT_OUTFIT,
  OUTFIT_STYLES,
  type Livery,
  type Outfit,
} from "../config/livery";

// The workshop's picks: the locomotive's livery and the driver's outfit.
// Apart from TrainContext, so a new colour only re-renders what wears it.

type LiveryContextValue = {
  livery: Livery;
  setLivery: (livery: Livery) => void;
  outfit: Outfit;
  setOutfit: (outfit: Outfit) => void;
};

const LiveryContext = createContext<LiveryContextValue | null>(null);

export function useLivery() {
  const context = useContext(LiveryContext);
  if (!context) {
    throw new Error("useLivery must be used within a LiveryProvider");
  }
  return context;
}

// Remembered in this browser between visits: only a convenience, so any
// failure to read or write it (private window, blocked storage) falls back
// to the defaults silently.
const STORAGE_KEY = "train-livery";

type Saved = { livery: Livery; outfit: Outfit };

const isColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

// Read once, as the provider mounts. The defaults on the server: nothing
// rendered there depends on them.
function load(): Saved {
  const saved: Saved = { livery: DEFAULT_LIVERY, outfit: DEFAULT_OUTFIT };
  if (typeof window === "undefined") return saved;
  try {
    const { livery, outfit } =
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? {};
    if (isColor(livery?.body) && isColor(livery.roof) && isColor(livery.trim)) {
      saved.livery = {
        body: livery.body,
        roof: livery.roof,
        trim: livery.trim,
      };
    }
    if (
      OUTFIT_STYLES.includes(outfit?.style) &&
      isColor(outfit.top) &&
      isColor(outfit.bottom)
    ) {
      saved.outfit = {
        style: outfit.style,
        top: outfit.top,
        bottom: outfit.bottom,
      };
    }
  } catch {
    // Unreadable: keep the defaults.
  }
  return saved;
}

export function LiveryProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(load);
  const [livery, setLivery] = useState(initial.livery);
  const [outfit, setOutfit] = useState(initial.outfit);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ livery, outfit }));
    } catch {
      // Not saved: the picks still hold for this visit.
    }
  }, [livery, outfit]);

  return (
    <LiveryContext.Provider value={{ livery, setLivery, outfit, setOutfit }}>
      {children}
    </LiveryContext.Provider>
  );
}
