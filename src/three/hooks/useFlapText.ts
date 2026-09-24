import { useEffect, useState } from "react";

const FLAP_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
// How often the unsettled letters flip, and how long each letter waits
// after the previous one before it settles (left to right).
const FLIP_INTERVAL_MS = 45;
const SETTLE_STEP_MS = 40;

function randomGlyph() {
  return FLAP_GLYPHS[Math.floor(Math.random() * FLAP_GLYPHS.length)];
}

// Split-flap text: each time `active` turns true, letters flip through
// random glyphs, then settle one by one. Returns the real text otherwise,
// and always with reduced motion.
export default function useFlapText(text: string, delay = 0, active = true) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (
      !active ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const start = performance.now() + delay;
    let lastFlip = -Infinity;
    let frame = requestAnimationFrame(function tick(now) {
      const elapsed = now - start;
      const settled = Math.floor(Math.max(elapsed, 0) / SETTLE_STEP_MS);
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
  }, [text, delay, active]);

  return shown;
}
