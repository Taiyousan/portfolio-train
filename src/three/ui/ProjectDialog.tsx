import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { StationProject } from "./types";

type Props = {
  projects: StationProject[];
  slug: string;
  // Shows another project in the same dialog.
  onSelect: (slug: string) => void;
  onClose: () => void;
};

// Field labels and the header band.
const LABEL = "font-mono text-[0.625rem] tracking-[0.2em] uppercase";

// Empty frames in the stub, waiting for the project images.
const IMAGE_SLOTS = 3;

// A project page's path, as written in the MDX bodies' links.
const PROJECT_PATH = /^\/projets\/([^/]+)\/?$/;

const pad = (n: number) => String(n).padStart(2, "0");

// A project's detail over the scene, shaped like a train ticket, as the
// ticket buttons (Ticket): the details on card stock, then a stub past a
// perforation with room for images and the actions. The ticket is in the
// look only, the text stays plain. The stub sits on the right, notched top
// and bottom; on phones, below, notched on either side. Only the details
// scroll, so the notches stay put. A native modal <dialog>: focus trap,
// Escape to close and focus returned to the board row come for free. It
// stays open from one project to the next (the stub's arrows, looping like
// the board, or a link to a project in the text), only the details swap.
export default function ProjectDialog({
  projects,
  slug,
  onSelect,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => dialogRef.current?.showModal(), []);
  const close = () => dialogRef.current?.close();

  const index = projects.findIndex((p) => p.slug === slug);
  const project = projects[index];
  const previous = projects.at(index - 1)!;
  const next = projects[(index + 1) % projects.length];

  // The arrows keep focus, so the new project is announced; a link in the
  // text goes away with the old details, so focus moves to the new title.
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusTitle = useRef(false);
  useEffect(() => {
    if (!focusTitle.current) return;
    focusTitle.current = false;
    titleRef.current?.focus();
  }, [slug]);

  const step = (target: StationProject) => {
    const position = projects.indexOf(target) + 1;
    setAnnouncement(
      `${target.title}, projet ${position} sur ${projects.length}`,
    );
    onSelect(target.slug);
  };

  // A link to a project page opens that project here instead of leaving
  // the scene, unless it's wanted elsewhere (new tab or window).
  const onTextClick = (e: MouseEvent<HTMLElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    const link = (e.target as Element).closest("a");
    if (!link) return;
    const url = new URL(link.href);
    const target =
      url.origin === location.origin
        ? PROJECT_PATH.exec(url.pathname)?.[1]
        : undefined;
    if (!target || !projects.some((p) => p.slug === target)) return;
    e.preventDefault();
    setAnnouncement("");
    focusTitle.current = true;
    onSelect(target);
  };

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
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        {/* Inset, so the scrollbar keeps clear of the perforation. Keyed on
            the project: the next one slides in, scrolled to the top. */}
        <div
          key={project.slug}
          onClick={onTextClick}
          className="scrollbar-ink my-2 mr-1.5 min-h-0 overflow-y-auto pt-3 pr-[calc(1.5rem-0.375rem)] pb-5 pl-6 transition duration-300 sm:mr-2 sm:pr-6 sm:pl-8 starting:translate-x-3 starting:opacity-0"
        >
          <h2
            id="project-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-3xl leading-none font-extrabold tracking-tight text-balance uppercase outline-none sm:text-4xl"
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

          <div className="mt-5 space-y-3 leading-relaxed [&_a]:font-semibold [&_a]:underline [&_a]:decoration-accent [&_a]:decoration-2">
            {project.body}
          </div>

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
          <ul
            aria-hidden="true"
            className="grid grid-cols-3 gap-2 sm:grid-cols-1"
          >
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

          <div className="flex flex-wrap gap-2 sm:flex-col">
            <nav
              aria-label="Autres projets"
              className="flex w-full items-center justify-between gap-1"
            >
              <StepButton
                label={`Projet précédent : ${previous.title}`}
                onClick={() => step(previous)}
              >
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </StepButton>
              <span
                aria-hidden="true"
                className="font-mono text-xs whitespace-nowrap tabular-nums"
              >
                {pad(index + 1)} / {pad(projects.length)}
              </span>
              <StepButton
                label={`Projet suivant : ${next.title}`}
                onClick={() => step(next)}
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </StepButton>
            </nav>
            {/* Printed barcode. */}
            <span
              aria-hidden="true"
              className="barcode mb-2 hidden h-8 opacity-60 sm:block"
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

// One of the stub's arrows to the previous or next project.
function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  // The arrow's path.
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full border border-foreground/40 transition hover:bg-foreground/10 active:scale-95"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
