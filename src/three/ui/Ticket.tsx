import type { CSSProperties, MouseEvent, Ref } from "react";

type Props = {
  kicker: string;
  title: string;
  // Hand-dealt look: a slight turn, straightened on hover.
  tilt: number;
  // Entrance stagger, in ms.
  delay: number;
  // A return ticket is printed on different card (.ticket-return), and,
  // small, mirrored: its stub on the left, a U-turn on it.
  variant?: "outbound" | "return";
  // A small ticket, as wide as its title: the title alone, and an arrow
  // on the stub.
  size?: "full" | "mini";
  // On the stub: an arrow (a U-turn, mirrored), or a cross for a ticket
  // that closes something.
  icon?: "arrow" | "close";
  ref?: Ref<HTMLButtonElement>;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
};

const ARROW = "M5 12h14M13 6l6 6-6 6";
const U_TURN = "M9 15 4 10l5-5M4 10h10.5a5.5 5.5 0 0 1 0 11H11";
const CROSS = "M6 6l12 12M18 6 6 18";

// A navigation button dressed as a train ticket: the fare on the left, a
// perforated stub on the right with the call to action, notches cut at the
// perforation (.ticket in globals.css).
export default function Ticket({
  kicker,
  title,
  tilt,
  delay,
  variant = "outbound",
  size = "full",
  icon = "arrow",
  ref,
  onClick,
}: Props) {
  const mini = size === "mini";
  const mirrored = variant === "return" && mini;
  // A full ticket fills its slot, up to 18rem: in a row on a tablet or a
  // phone held sideways, it narrows, its stub and margins with it. On
  // phones and short screens, it's pared down to its title and arrow.
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      style={{ rotate: `${tilt}deg`, transitionDelay: `${delay}ms` }}
      className={`group pointer-events-auto block w-full text-left text-ticket-ink drop-shadow-xl transition duration-300 ease-out outline-offset-4 outline-board-ink hover:-translate-y-1.5 hover:rotate-0! hover:delay-0! focus-visible:-translate-y-1.5 focus-visible:rotate-0! focus-visible:outline-2 focus-visible:delay-0! active:translate-y-0 active:scale-[0.98] starting:translate-y-8 starting:opacity-0 ${mini ? "max-w-full [--stub:2.5rem] sm:w-max" : "max-w-72 [--stub:2.75rem] sm:[--stub:4rem] sm:max-lg:[--stub:3rem]"} ${variant === "return" ? "ticket-return" : ""}`}
    >
      {/* The mask would clip the drop shadow: it goes on this inner card,
          the shadow and motion on the button. The notches follow the
          stub. */}
      <span
        style={
          {
            "--notch-x": mirrored ? "var(--stub)" : "calc(100% - var(--stub))",
          } as CSSProperties
        }
        className={`ticket flex bg-ticket ${mirrored ? "flex-row-reverse" : ""}`}
      >
        <span
          className={`min-w-0 flex-1 ${mini ? "px-3 py-2" : "px-3 py-3 sm:px-4 sm:max-lg:px-3"}`}
        >
          {!mini && (
            <span className="block truncate font-mono text-[0.625rem] tracking-[0.2em] text-ticket-ink/60 uppercase max-sm:hidden short:hidden">
              {kicker}
            </span>
          )}
          <span
            className={`block truncate leading-tight font-extrabold tracking-tight uppercase ${mini ? "text-sm" : "text-base sm:mt-0.5 sm:text-lg short:mt-0 short:text-base"}`}
          >
            {title}
          </span>
        </span>
        {/* Stub, past the perforation. */}
        <span
          className={`flex shrink-0 flex-col items-center justify-center gap-1 border-dashed border-ticket-ink/25 bg-ticket-stamp/10 transition group-hover:bg-ticket-stamp group-hover:text-ticket group-focus-visible:bg-ticket-stamp group-focus-visible:text-ticket w-(--stub) ${mirrored ? "border-r-2" : "border-l-2"}`}
        >
          {!mini && (
            <span className="font-mono text-[0.625rem] tracking-widest uppercase max-sm:hidden short:hidden">
              Départ
            </span>
          )}
          <span
            className={`transition ${icon === "close" ? "group-hover:rotate-90" : mirrored ? "group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className={`block ${mini ? "size-4" : "size-5 sm:size-6"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d={icon === "close" ? CROSS : mirrored ? U_TURN : ARROW}
              />
            </svg>
          </span>
        </span>
      </span>
    </button>
  );
}
