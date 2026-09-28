import { useEffect, useRef } from "react";
import FlapText from "./FlapText";
import type { StationProject } from "./types";

type Props = {
  project: StationProject;
  line: string;
  onClose: () => void;
};

// A project's detail over the scene, dressed as the ticket handed out once
// a destination is picked on the board: the board's split-flap strip on
// top, then printed card stock below a perforation, with a notch cut at
// each end. The shared ProjectDetail inside follows through the
// .theme-ticket tokens. Only the card scrolls, so the notches stay put. A
// native modal <dialog>: focus trap, Escape to close and focus returned to
// the board row come for free.
export default function ProjectDialog({ project, line, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => dialogRef.current?.showModal(), []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="project-title"
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      // The masks would clip a box shadow: a drop shadow follows the notches.
      className="theme-ticket pointer-events-auto m-auto max-h-[90dvh] w-[min(48rem,calc(100%-2rem))] flex-col overflow-visible border-0 bg-transparent p-0 text-foreground drop-shadow-2xl transition duration-300 backdrop:bg-black/70 open:flex starting:scale-95 starting:opacity-0"
    >
      {/* Split-flap header, as on the board: a dark hinge line runs through
          the time/line and the destination. */}
      <header className="notch-bottom shrink-0 rounded-t-xl bg-board-flap px-6 pt-5 pb-4 text-board-ink sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <p className="font-mono text-xs tracking-wider uppercase opacity-80">
            {line}
          </p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="-mt-1 min-h-11 shrink-0 rounded-full border border-board-ink/60 px-4 font-mono text-xs uppercase hover:bg-board"
          >
            Fermer
          </button>
        </div>
        <h2
          id="project-title"
          className="relative mt-1 font-mono text-2xl font-semibold tracking-wide uppercase sm:text-3xl"
        >
          <FlapText text={project.title} />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-px bg-board"
          />
        </h2>
      </header>

      {/* Card stock, past the perforation. */}
      <div className="notch-top min-h-0 overflow-y-auto rounded-b-xl border-t-2 border-dashed border-ticket-ink/30 bg-background px-6 pt-6 pb-8 sm:px-10 sm:pb-10">
        <p className="text-lg text-muted">{project.summary}</p>
        {project.detail}
      </div>
    </dialog>
  );
}
