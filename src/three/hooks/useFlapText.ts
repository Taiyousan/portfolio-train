import { useEffect, useState } from "react";

const FLAP_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
// How often the unsettled letters flip, and how long each letter waits
// after the previous one before it settles (left to right).
const FLIP_INTERVAL_MS = 45;
const SETTLE_STEP_MS = 40;

function randomGlyph() {
  return FLAP_GLYPHS[Math.floor(Math.random() * FLAP_GLYPHS.length)];
}

// Split-flap text: while `settle` is false, letters keep flipping through
// random glyphs; each time it turns true, they settle one by one after
// `delay`. Always the real text with reduced motion.
export default function useFlapText(text: string, delay = 0, settle = true) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const start = performance.now() + delay;
    let lastFlip = -Infinity;
    let frame = requestAnimationFrame(function tick(now) {
      const settled = settle
        ? Math.floor(Math.max(now - start, 0) / SETTLE_STEP_MS)
        : 0;
      if (settled >= text.length) {
        setShown(text);
        return;
      }
      if (now - lastFlip >= FLIP_INTERVAL_MS) {
        lastFlip = now;
        setShown(
          Array.from(text, (char, i) =>
            i < settled || char === " " ? char : randomGlyph(),
          ).join(""),
        );
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [text, delay, settle]);

  return shown;
}
