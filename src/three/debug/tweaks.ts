import { useSyncExternalStore } from "react";

// Settings tuned live in the Leva panel with #debug in the URL (see
// DebugPanel). Without it, Leva isn't even downloaded: every setting keeps
// its default value.

export type TweakValue = number | string | boolean;
type Setting =
  TweakValue | { value: TweakValue; min?: number; max?: number; step?: number };
export type TweakSchema = Record<string, Setting>;

type Widen<T> = T extends number
  ? number
  : T extends string
    ? string
    : T extends boolean
      ? boolean
      : never;
type TweakValues<S extends TweakSchema> = {
  [K in keyof S]: Widen<S[K] extends { value: infer V } ? V : S[K]>;
};

type Folder = { schema: TweakSchema; values: Record<string, TweakValue> };

const folders = new Map<string, Folder>();
let folderNames: string[] = [];
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

// The first schema given for a folder is its own, whoever uses it next.
function folder(name: string, schema: TweakSchema) {
  let found = folders.get(name);
  if (!found) {
    const values = Object.fromEntries(
      Object.entries(schema).map(([key, setting]) => [
        key,
        typeof setting === "object" ? setting.value : setting,
      ]),
    );
    found = { schema, values };
    folders.set(name, found);
    folderNames = [...folders.keys()];
    // Registered while rendering: the panel hears of it once that's done.
    queueMicrotask(notify);
  }
  return found;
}

// The values of the `name` folder's settings: Leva's in debug mode, the
// defaults otherwise. Same schema as Leva's useControls (values, or
// { value, min, max, step }).
export function useTweaks<S extends TweakSchema>(name: string, schema: S) {
  const { values } = folder(name, schema);
  return useSyncExternalStore(
    subscribe,
    () => folders.get(name)!.values,
    () => values,
  ) as TweakValues<S>;
}

// For DebugPanel.
export function useTweakFolders() {
  return useSyncExternalStore(
    subscribe,
    () => folderNames,
    () => folderNames,
  );
}

export function getTweakSchema(name: string) {
  return folders.get(name)!.schema;
}

export function setTweaks(name: string, values: Record<string, TweakValue>) {
  const found = folders.get(name)!;
  const changed = Object.keys(values).some(
    (key) => values[key] !== found.values[key],
  );
  if (!changed) return;
  found.values = { ...values };
  notify();
}
