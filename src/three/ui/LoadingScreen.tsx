import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import { site } from "@/lib/site";
import { useTrainContext } from "../state/TrainContext";
import FlapText from "./FlapText";

// Share of the track the downloads fill; the rest waits for the scene's
// first frames (shader builds, see useShaderWarmup).
const ASSETS_SHARE = 0.85;
// How fast the locomotive catches up with the progress (exponential, per s).
const CATCH_UP = 5;
// Meanwhile it keeps creeping towards CREEP_TO (exponential, per s), so a
// long wait (shader builds on a slow GPU) never looks stuck.
const CREEP = 0.1;
const CREEP_TO = 92;
// Once it's in, the full track shows for HOLD_MS, then the screen fades out
// over FADE_MS.
const HOLD_MS = 400;
const FADE_MS = 700;
// Chimney puffs, one after the other.
const PUFFS = [0, 500, 1000];

// Shown over the scene while it loads, printed on the tickets' card stock
// (.theme-ticket) like the rest of the overlay: the site's name (flapping
// into place), a locomotive riding the track as the progress bar, the
// track inked in the stamp's red behind it, then a fade onto the scene.
// Rendered on the server, so it's up before the scripts are. `onBoarded`
// fires as it starts fading out.
export default function LoadingScreen({
  onBoarded,
}: {
  onBoarded: () => void;
}) {
  const { ready } = useTrainContext();
  // drei's progress restarts at 0 for each new batch of downloads: the
  // locomotive only ever moves forward.
  const { progress } = useProgress();
  const target = ready
    ? 100
    : (Number.isFinite(progress) ? progress : 0) * ASSETS_SHARE;
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  useEffect(() => {
    const instant = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const value = shownRef.current;
      if (value >= 100) return;
      const dt = Math.max(now - last, 0) / 1000;
      last = now;
      const gap = Math.max(target - value, 0);
      let next =
        instant || gap < 0.5
          ? value + gap
          : value + gap * (1 - Math.exp(-CATCH_UP * dt));
      if (!ready) {
        next += Math.max(CREEP_TO - next, 0) * (1 - Math.exp(-CREEP * dt));
      }
      shownRef.current = next;
      setShown(next);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, ready]);

  const arrived = ready && shown >= 100;
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const board = useEffectEvent(onBoarded);
  useEffect(() => {
    if (!arrived) return;
    const leave = setTimeout(() => {
      setLeaving(true);
      board();
    }, HOLD_MS);
    const remove = setTimeout(() => setGone(true), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(remove);
    };
  }, [arrived]);

  if (gone) return null;

  return (
    <div
      style={{ transitionDuration: `${FADE_MS}ms` }}
      className={`absolute inset-0 grid place-items-center theme-ticket bg-background px-6 text-foreground transition-opacity ease-out ${leaving ? "pointer-events-none opacity-0" : ""}`}
    >
      <div className="w-full max-w-sm font-mono">
        <p className="text-2xl font-bold tracking-widest uppercase">
          <FlapText text={site.name} />
        </p>
        <p className="mt-1 text-xs text-muted">{site.role}</p>

        <div
          role="progressbar"
          aria-label="Chargement de la scène"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(shown)}
          className="mt-10"
        >
          {/* The locomotive rides from one end of the track to the other,
              never past it. */}
          <div className="relative h-9">
            <div
              style={{ left: `${shown}%`, translate: `-${shown}% 0` }}
              className="absolute bottom-0"
            >
              <Locomotive />
              {PUFFS.map((delay) => (
                <span
                  key={delay}
                  aria-hidden="true"
                  style={{ animationDelay: `${delay}ms` }}
                  className="absolute -top-1.5 left-[37px] size-3 animate-[puff_1.5s_ease-out_infinite_both] rounded-full bg-muted/30 motion-reduce:hidden"
                />
              ))}
            </div>
          </div>
          {/* Sleepers under a rail, inked behind the locomotive. */}
          <div className="relative h-1.5 bg-[repeating-linear-gradient(90deg,currentColor_0_2px,transparent_2px_9px)] text-foreground/20">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-foreground/20" />
            <div
              style={{ width: `${shown}%` }}
              className="absolute top-0 left-0 h-0.5 bg-accent"
            />
          </div>
        </div>

        <p className="mt-4 flex justify-between text-xs tracking-widest uppercase">
          <span className="text-muted">Chargement</span>
          <span aria-hidden="true" className="tabular-nums">
            {Math.round(shown)} %
          </span>
        </p>
      </div>
    </div>
  );
}

// Side view of a steam locomotive heading right, in the current ink; the
// cab's window and the wheels' hubs in the card's colour. Its chimney
// tops out at (29, 2), drawn at 1.5 px per unit.
function Locomotive() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 24"
      className="block h-9 w-15 fill-current"
    >
      <path d="M2 2h15v3h-2v12H4V5H2z" />
      <rect x="7" y="7" width="5" height="4" rx="0.5" className="fill-background" />
      <rect x="14" y="8" width="20" height="9" rx="2" />
      <rect x="19" y="5.5" width="4" height="3" rx="1" />
      <path d="M27 9V4h-1V2h6v2h-1v5z" />
      <path d="M3 16h33l3 5h-4l-1-2H3z" />
      {[9, 18, 27].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="20" r="3" />
          <circle cx={cx} cy="20" r="1" className="fill-background" />
        </g>
      ))}
    </svg>
  );
}
