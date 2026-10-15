import { useEffect, useRef } from "react";
import { departureTime, ROW_FLAP_DELAY_MS } from "../config/departures";
import FlapText from "./FlapText";
import type { StationProject } from "./types";

type Props = {
  projects: StationProject[];
  // Move focus to the board's heading on mount (keyboard arrival only: a
  // focused element inside reveals the board).
  autoFocus: boolean;
  onSelect: (slug: string) => void;
  onDepart: () => void;
};

// HTML twin of the 3D departures board, while the train waits at the
// station: a row opens the project's dialog. The 3D board is in charge:
// this one stays invisible, still read by screen readers, and shows up as
// soon as it holds keyboard focus.
export default function DeparturesBoard({
  projects,
  autoFocus,
  onSelect,
  onDepart,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (autoFocus) headingRef.current?.focus();
  }, [autoFocus]);

  return (
    <section
      aria-labelledby="departures-title"
      className="pointer-events-none absolute inset-x-0 bottom-0 flex max-h-[60dvh] flex-col rounded-t-2xl bg-board p-4 text-board-ink opacity-0 shadow-2xl transition delay-300 duration-500 has-focus:pointer-events-auto has-focus:opacity-100 has-focus:delay-0 sm:inset-x-auto sm:top-20 sm:bottom-auto sm:left-5 sm:max-h-[calc(100dvh-7rem)] sm:w-[34rem] sm:rounded-2xl sm:p-5 starting:translate-y-6 starting:opacity-0 sm:short:top-16 sm:short:max-h-[calc(100dvh-5rem)]"
    >
      <header className="flex items-baseline justify-between gap-4 border-b border-board-flap pb-3">
        <h2
          id="departures-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-mono text-xl font-bold tracking-widest uppercase outline-none"
        >
          Mes projets
        </h2>
        <p className="font-mono text-xs text-board-ink/70 uppercase">
          Choisissez un projet
        </p>
      </header>

      <ul className="-mx-2 mt-2 overflow-y-auto">
        {projects.map((project, i) => (
          <li key={project.slug}>
            <button
              type="button"
              onClick={() => onSelect(project.slug)}
              className="grid min-h-11 w-full grid-cols-[auto_1fr] items-baseline gap-x-4 rounded-lg px-2 py-2 text-left hover:bg-board-flap focus-visible:bg-board-flap focus-visible:outline-2 focus-visible:outline-board-ink"
            >
              <span className="font-mono text-lg tabular-nums">
                {departureTime(i)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-mono text-lg font-semibold tracking-wide uppercase">
                  <FlapText
                    text={project.title}
                    delay={i * ROW_FLAP_DELAY_MS}
                  />
                </span>
                <span className="block truncate text-xs text-board-ink/70">
                  {project.technos.join(" · ")}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex justify-end border-t border-board-flap pt-3">
        <button
          type="button"
          onClick={onDepart}
          className="min-h-11 rounded-full border border-board-ink/60 px-4 font-mono text-sm uppercase hover:bg-board-flap"
        >
          Retour
        </button>
      </div>
    </section>
  );
}
