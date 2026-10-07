import { useEffect, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { claimPointer, releasePointer } from "../state/pointerCursor";

// Pointer handlers for something in the scene reacting to clicks (a
// driver, the train), spread on it: clicked while `active` (in view),
// `onClick` (a wave, a jump...), with a pointer cursor over it (see
// pointerCursor), let go if it stops being active under the pointer. The
// events stop at it, so nothing behind takes them.
export default function useClickable(active: boolean, onClick: () => void) {
  // Its claim on the pointer cursor.
  const [owner] = useState(() => ({}));
  useEffect(() => {
    if (!active) releasePointer(owner);
  }, [active, owner]);

  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (!active) return;
      e.stopPropagation();
      onClick();
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      if (!active) return;
      e.stopPropagation();
      claimPointer(owner);
    },
    onPointerOut: () => releasePointer(owner),
  };
}
