import type { MouseEvent } from "react";

type Props = {
  kicker: string;
  title: string;
  // Hand-dealt look: a slight turn, straightened on hover.
  tilt: number;
  // Entrance stagger, in ms.
  delay: number;
  // A return ticket is printed on different card (.ticket-return).
  variant?: "outbound" | "return";
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
};

// A navigation button dressed as a train ticket: the fare on the left, a
// perforated stub on the right with the call to action, notches cut at the
// perforation (.ticket in globals.css).
export default function Ticket({
  kicker,
  title,
  tilt,
  delay,
  variant = "outbound",
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ rotate: `${tilt}deg`, transitionDelay: `${delay}ms` }}
      className={`group pointer-events-auto block w-full max-w-72 text-left text-ticket-ink drop-shadow-xl transition duration-300 ease-out outline-offset-4 outline-board-ink hover:-translate-y-1.5 hover:rotate-0! hover:delay-0! focus-visible:-translate-y-1.5 focus-visible:rotate-0! focus-visible:outline-2 focus-visible:delay-0! active:translate-y-0 active:scale-[0.98] starting:translate-y-8 starting:opacity-0 sm:w-72 ${variant === "return" ? "ticket-return" : ""}`}
    >
      {/* The mask would clip the drop shadow: it goes on this inner card,
          the shadow and motion on the button. */}
      <span className="ticket flex bg-ticket">
        <span className="min-w-0 flex-1 px-4 py-3">
          <span className="block font-mono text-[0.625rem] tracking-[0.2em] text-ticket-ink/60 uppercase">
            {kicker}
          </span>
          <span className="mt-0.5 block truncate text-lg leading-tight font-extrabold tracking-tight uppercase">
            {title}
          </span>
        </span>
        {/* Stub, past the perforation. */}
        <span className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 border-l-2 border-dashed border-ticket-ink/25 bg-ticket-stamp/10 transition group-hover:bg-ticket-stamp group-hover:text-ticket group-focus-visible:bg-ticket-stamp group-focus-visible:text-ticket">
          <span className="font-mono text-[0.625rem] tracking-widest uppercase">
            Départ
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6 transition group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </span>
    </button>
  );
}
