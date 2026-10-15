import { shade, type Livery, type Outfit } from "../config/livery";

// Small pictures of the locomotive and its driver in their colours, for the
// workshop's options and the about card's photo.

// Colours of the parts no pick changes (see models/Locomotive and Driver).
const ICON = {
  iron: "#34353b",
  smokebox: "#2c2e35",
  glass: "#9cc7e0",
  skin: "#e2b48c",
  hair: "#33231a",
  beard: "#45322a",
  eye: "#2a1d15",
  gold: "#e2b54c",
  red: "#a4493a",
  shirt: "#f1e8d4",
  visor: "#1c1d24",
};

// The locomotive side on, facing right, in a livery's colours.
export function LocomotiveIcon({ livery }: { livery: Livery }) {
  const { body, roof, trim } = livery;
  return (
    <svg aria-hidden="true" viewBox="0 0 64 38" className="h-9 w-full">
      {/* Chimney, dome, boiler with its bands, smokebox */}
      <rect x="43" y="4" width="6" height="9" rx="1" fill={ICON.smokebox} />
      <rect x="42" y="3" width="8" height="2.5" rx="1" fill={trim} />
      <rect x="27" y="8" width="7" height="6" rx="3" fill={trim} />
      <rect x="15" y="12" width="30" height="13" rx="6.5" fill={body} />
      <rect x="21" y="12" width="1.8" height="13" fill={trim} />
      <rect x="33" y="12" width="1.8" height="13" fill={trim} />
      <rect x="41" y="11" width="11" height="15" rx="5" fill={ICON.smokebox} />
      <circle cx="51" cy="12" r="2.2" fill={ICON.gold} />
      {/* Cab, its window and roof */}
      <rect x="4" y="7" width="13" height="20" rx="2" fill={body} />
      <rect x="7" y="10" width="7" height="6" rx="1.5" fill={ICON.glass} />
      <rect x="4" y="17.5" width="13" height="1.5" fill={trim} />
      <rect x="2" y="4" width="17" height="4" rx="2" fill={roof} />
      {/* Frame, cowcatcher, wheels */}
      <rect x="3" y="25" width="51" height="3" rx="1.5" fill={ICON.iron} />
      <path d="M53 25h3l5 10h-8z" fill={ICON.iron} />
      {[
        { x: 13, r: 5.5 },
        { x: 27, r: 5.5 },
        { x: 44, r: 3.5 },
      ].map(({ x, r }) => (
        <g key={x}>
          <circle cx={x} cy={37 - r} r={r} fill={ICON.iron} />
          <circle cx={x} cy={37 - r} r={r - 1.8} fill={body} />
          <circle cx={x} cy={37 - r} r={1.2} fill={trim} />
        </g>
      ))}
      <rect x="12" y="30" width="16" height="1.6" rx="0.8" fill="#8d939c" />
    </svg>
  );
}

// The driver's curls, [cx, cy, r]: round the top of the head, and lower
// down by the ears. Then the fringe's, along the hairline.
const CURLS = [
  [11.4, 15.6, 2.8],
  [11.9, 11.6, 3.3],
  [13.9, 8.4, 3.3],
  [16.8, 6.5, 3.3],
  [20, 5.9, 3.3],
  [23.2, 6.5, 3.3],
  [26.1, 8.4, 3.3],
  [28.1, 11.6, 3.3],
  [28.6, 15.6, 2.8],
];
const FRINGE = [14.6, 18.2, 21.8, 25.4];

// The driver's head and shoulders in an outfit.
export function DriverIcon({
  outfit,
  className = "h-9 w-full",
}: {
  outfit: Outfit;
  className?: string;
}) {
  const { style, top, bottom } = outfit;
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className={className}>
      {/* Shoulders, and what's worn over them */}
      <rect x="8" y="26" width="24" height="18" rx="8" fill={top} />
      {style === "uniform" && (
        <>
          <path d="M17 26h6l-3 3.5z" fill={ICON.shirt} />
          <path d="M19 28h2l1 7-2 2-2-2z" fill={ICON.red} />
          <circle cx="20" cy="38.5" r="0.9" fill={ICON.gold} />
        </>
      )}
      {style === "overalls" && (
        <>
          <rect x="13.5" y="31" width="13" height="10" rx="1.5" fill={bottom} />
          <rect x="14" y="26" width="2.2" height="6" fill={bottom} />
          <rect x="23.8" y="26" width="2.2" height="6" fill={bottom} />
          <circle cx="15.1" cy="32" r="0.9" fill={ICON.gold} />
          <circle cx="24.9" cy="32" r="0.9" fill={ICON.gold} />
          <path d="M15.5 25.5h9L20 31z" fill={ICON.red} />
        </>
      )}
      {style === "hoodie" && (
        <>
          <ellipse cx="20" cy="26.5" rx="8" ry="2.6" fill={shade(top, 0.8)} />
          <rect
            x="14.5"
            y="34"
            width="11"
            height="6"
            rx="2"
            fill={shade(top, 0.85)}
          />
          <path
            d="M18.5 28v4M21.5 28v4"
            stroke={ICON.shirt}
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </>
      )}
      {/* Curly hair, as a crown of curls around the head (under a cap,
          only those on the sides show), then the head, a curly fringe,
          beard and face */}
      <circle cx="20" cy="14.5" r="8.8" fill={ICON.hair} />
      {CURLS.map(([cx, cy, r]) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={r} fill={ICON.hair} />
      ))}
      <circle cx="20" cy="16.5" r="7.6" fill={ICON.skin} />
      {FRINGE.map((cx) => (
        <circle key={cx} cx={cx} cy="9.6" r="2.1" fill={ICON.hair} />
      ))}
      <path
        d="M12.5 16.5a7.5 7.5 0 0 0 15 0 7.5 4.5 0 0 1-15 0z"
        fill={ICON.beard}
      />
      <circle cx="17.3" cy="16" r="0.9" fill={ICON.eye} />
      <circle cx="22.7" cy="16" r="0.9" fill={ICON.eye} />
      <path
        d="M18.2 20q1.8 1.2 3.6 0"
        stroke={ICON.eye}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      {style === "uniform" && (
        <g transform="rotate(4 20 10)">
          <path d="M11 11.5 12 5h16l1 6.5z" fill={bottom} />
          <rect x="11" y="9.2" width="18" height="1.1" fill={ICON.gold} />
          <rect
            x="18.8"
            y="6.3"
            width="2.4"
            height="2"
            rx="0.5"
            fill={ICON.gold}
          />
          <path d="M13 11.5h13l-1.5 2.2H14z" fill={ICON.visor} />
        </g>
      )}
      {style === "overalls" && (
        <g transform="rotate(-4 20 10)">
          <path d="M11.2 11.5a8.8 7 0 0 1 17.6 0z" fill={bottom} />
          <rect
            x="11.2"
            y="10"
            width="17.6"
            height="2"
            rx="1"
            fill={shade(bottom, 0.8)}
          />
          <path d="M13 11.8h12.5l-1.2 2.2H14z" fill={shade(bottom, 0.8)} />
        </g>
      )}
    </svg>
  );
}
