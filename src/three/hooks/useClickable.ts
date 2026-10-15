import { useEffect, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { claimPointer, releasePointer } from "../state/pointerCursor";

// Pointer handlers to spread on something in the scene that reacts to
// clicks while `active`, with a pointer cursor over it. The events stop at
// it, so nothing behind takes them.
export default function useClickable(active: boolean, onClick: () => void) {
  // Its claim on the pointer cursor (see pointerCursor).
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
