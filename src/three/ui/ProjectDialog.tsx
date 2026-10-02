import { useEffect, useRef, type ReactNode } from "react";
import type { StationProject } from "./types";

type Props = {
  project: StationProject;
  onClose: () => void;
};

// Field labels and the header band.
const LABEL = "font-mono text-[0.625rem] tracking-[0.2em] uppercase";

// Empty frames in the stub, waiting for the project images.
const IMAGE_SLOTS = 3;

// A project's detail over the scene, shaped like a train ticket, as the
// ticket buttons (Ticket): the details on card stock, then a stub past a
// perforation with room for images and the actions. The ticket is in the
// look only, the text stays plain. The stub sits on the right, notched top
// and bottom; on phones, below, notched on either side. Only the details
// scroll, so the notches stay put. A native modal <dialog>: focus trap,
// Escape to close and focus returned to the board row come for free.
export default function ProjectDialog({ project, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => dialogRef.current?.showModal(), []);
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="project-title"
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      // The masks would clip a box shadow: a drop shadow follows the notches.
      className="theme-ticket pointer-events-auto m-auto max-h-[90dvh] w-[min(52rem,calc(100%-2rem))] flex-col overflow-visible border-0 bg-transparent p-0 text-foreground drop-shadow-2xl transition duration-300 backdrop:bg-black/70 open:flex sm:max-h-[min(36rem,90dvh)] sm:flex-row starting:translate-y-6 starting:-rotate-1 starting:opacity-0"
    >
      {/* The details. */}
      <div className="notch-bottom flex min-h-0 flex-1 flex-col rounded-t-xl bg-background sm:notch-right sm:rounded-l-xl sm:rounded-tr-none">
        <p
          className={`${LABEL} shrink-0 rounded-t-xl bg-foreground px-6 py-2 text-background sm:rounded-tr-none sm:px-8`}
        >
          {project.type === "pro" ? "Projet pro" : "Projet perso"}
        </p>

        {/* Inset, so the scrollbar keeps clear of the perforation. */}
        <div className="scrollbar-ink my-2 mr-1.5 min-h-0 overflow-y-auto pt-3 pr-[calc(1.5rem-0.375rem)] pb-5 pl-6 sm:mr-2 sm:pr-6 sm:pl-8">
          <h2
            id="project-title"
            className="text-3xl leading-none font-extrabold tracking-tight text-balance uppercase sm:text-4xl"
          >
            {project.title}
          </h2>
          <p className="mt-2 text-muted">{project.summary}</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-4 sm:grid-cols-3">
            <Field label="Rôle">
              {project.role.charAt(0).toUpperCase() + project.role.slice(1)}
            </Field>
            {project.clients.length > 0 && (
              <Field label="Pour">{project.clients.join(", ")}</Field>
            )}
            {project.partners.length > 0 && (
              <Field label="Avec">{project.partners.join(", ")}</Field>
            )}
            <Field label="Technos" wide>
              <span className="font-mono text-xs tracking-wider uppercase">
                {project.technos.join(" · ")}
              </span>
            </Field>
          </dl>

          <div className="mt-5 space-y-3 leading-relaxed">{project.body}</div>

          <h3 className={`${LABEL} mt-6 font-normal text-muted`}>Missions</h3>
          <ul className="mt-3 ml-1.5 space-y-2 border-l-2 border-dotted border-foreground/30 pl-5 text-sm">
            {project.tasks.map((t) => (
              <li
                key={t}
                className="relative before:absolute before:top-[5px] before:-left-6 before:size-2.5 before:rounded-full before:border-2 before:border-accent before:bg-background"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* The stub, past the perforation, tinted like the buttons' stubs. */}
      <div className="notch-top flex shrink-0 flex-col rounded-b-xl border-t-2 border-dashed border-foreground/25 bg-background bg-linear-to-b from-accent/10 to-accent/10 sm:notch-left sm:w-48 sm:rounded-r-xl sm:rounded-bl-none sm:border-t-0 sm:border-l-2">
        {/* The details' band runs on across the stub, a blank line of the
            same type for the same height. */}
        <span
          aria-hidden="true"
          className={`${LABEL} hidden shrink-0 rounded-tr-xl bg-foreground py-2 sm:block`}
        >
          &nbsp;
        </span>
        <div className="flex flex-1 flex-col gap-4 px-6 py-4 sm:justify-between sm:px-5 sm:py-5">
          {/* Room for a few project images, still to be made. */}
          <ul aria-hidden="true" className="grid grid-cols-3 gap-2 sm:grid-cols-1">
            {Array.from({ length: IMAGE_SLOTS }, (_, i) => (
              <li
                key={i}
                className="grid aspect-video place-items-center rounded-md border-2 border-dashed border-foreground/25 bg-foreground/5 text-foreground/30"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="8.5" cy="10" r="1.5" />
                  <path d="m21 15-5-5-8 9" />
                </svg>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 sm:flex-col">
            {/* Printed barcode. */}
            <span
              aria-hidden="true"
              className="mb-2 hidden h-8 bg-[repeating-linear-gradient(90deg,currentColor_0_2px,transparent_2px_4px,currentColor_4px_5px,transparent_5px_7px,currentColor_7px_10px,transparent_10px_12px)] opacity-60 sm:block"
            />
            {project.href && (
              <a
                href={project.href}
                className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-accent px-3 font-mono text-xs tracking-wide whitespace-nowrap text-on-accent uppercase transition hover:text-on-accent hover:brightness-110 sm:flex-none"
              >
                Voir en ligne ↗
              </a>
            )}
            <button
              type="button"
              autoFocus
              onClick={close}
              className="min-h-11 flex-1 rounded-full border border-foreground/40 px-4 font-mono text-xs tracking-wider uppercase transition hover:bg-foreground/10 sm:flex-none"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  // Spans the whole row.
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "col-span-full" : undefined}>
      <dt className={`${LABEL} text-muted`}>{label}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}
