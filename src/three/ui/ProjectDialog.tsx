import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
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

// Screenshots the stub has room for.
const MAX_IMAGES = 3;

// A project page's path, as written in the MDX bodies' links.
const PROJECT_PATH = /^\/projets\/([^/]+)\/?$/;

const pad = (n: number) => String(n).padStart(2, "0");

// A project's detail over the scene, shaped like a train ticket: the
// details on card stock, then a stub past a perforation with the
// screenshots and the actions (on the right, or below on phones). Only the
// details scroll, so the notches stay put. A native modal <dialog>: focus
// trap, Escape and focus return come for free. It stays open from one
// project to the next (the stub's arrows, or a project link in the text).
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
  const images = project.images.slice(0, MAX_IMAGES);
  // The screenshot open in the viewer, if any.
  const [viewing, setViewing] = useState<number | null>(null);

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
      // React hands this the image viewer's close too.
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      // A click on the backdrop lands on the <dialog> itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      // A set size whatever the project, so the arrows stay put from one to
      // the next. The masks would clip a box shadow: a drop shadow follows
      // the notches.
      className="theme-ticket pointer-events-auto m-auto h-[90dvh] w-[min(52rem,calc(100%-2rem))] flex-col overflow-visible border-0 bg-transparent p-0 text-foreground drop-shadow-2xl transition duration-300 backdrop:bg-black/70 open:flex sm:h-[min(36rem,90dvh)] sm:flex-row starting:translate-y-6 starting:-rotate-1 starting:opacity-0"
    >
      {/* The details. */}
      <div className="flex min-h-0 flex-1 flex-col rounded-t-xl bg-background notch-bottom sm:rounded-l-xl sm:rounded-tr-none sm:notch-right">
        <p
          className={`${LABEL} shrink-0 rounded-t-xl bg-foreground px-6 py-2 text-background sm:rounded-tr-none sm:px-8`}
        >
          {project.type === "pro" ? "Projet pro" : "Projet perso"}
          {project.year && ` · ${project.year}`}
        </p>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        {/* Inset, so the scrollbar keeps clear of the perforation. Keyed on
            the project: the next one slides in, scrolled to the top. */}
        <div
          key={project.slug}
          onClick={onTextClick}
          className="my-2 mr-1.5 min-h-0 scrollbar-ink overflow-y-auto pt-3 pr-[calc(1.5rem-0.375rem)] pb-5 pl-6 transition duration-300 sm:mr-2 sm:pr-6 sm:pl-8 starting:translate-x-3 starting:opacity-0"
        >
          <h2
            id="project-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-3xl leading-none font-extrabold tracking-tight text-balance uppercase outline-none sm:text-4xl"
          >
            {project.title}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-4 sm:grid-cols-3">
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

          {/* The summary, the body's detail under it, smaller. */}
          <p className="mt-5 text-lg leading-snug font-medium text-pretty">
            {project.summary}
          </p>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted [&_a]:font-semibold [&_a]:text-foreground [&_a]:underline [&_a]:decoration-accent [&_a]:decoration-2">
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
      <div className="flex shrink-0 flex-col rounded-b-xl border-t-2 border-dashed border-foreground/25 bg-background bg-linear-to-b from-accent/10 to-accent/10 notch-top sm:w-48 sm:rounded-r-xl sm:rounded-bl-none sm:border-t-0 sm:border-l-2 sm:notch-left">
        {/* The details' band runs on across the stub. */}
        <span
          aria-hidden="true"
          className={`${LABEL} hidden shrink-0 rounded-tr-xl bg-foreground py-2 sm:block`}
        >
          &nbsp;
        </span>
        <div className="flex flex-1 flex-col gap-4 px-6 py-4 sm:px-5 sm:py-5">
          {/* The project's screenshots, faded in with each project, each
              opening the viewer. Left out on short screens, where the
              actions need the height. */}
          {images.length > 0 && (
            <ul
              key={project.slug}
              aria-label="Captures"
              className="grid grid-cols-3 gap-2 transition duration-300 sm:grid-cols-1 starting:opacity-0 short:hidden"
            >
              {images.map((src, i) => (
                <li key={src}>
                  <button
                    type="button"
                    aria-label={`Agrandir la capture ${i + 1} sur ${images.length}`}
                    onClick={() => setViewing(i)}
                    className="group block w-full overflow-hidden rounded-md border border-foreground/15 transition hover:border-accent"
                  >
                    <Image
                      src={src}
                      alt=""
                      width={640}
                      height={360}
                      sizes="(min-width: 640px) 152px, calc(33vw - 32px)"
                      className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* The arrows keep their place from one project to the next,
              however many screenshots and with or without "Voir en ligne":
              on phones, first in a row under the screenshots' (one row
              high, whatever their number); beside the ticket, laid out in
              the stub's column, "Voir en ligne" under the screenshots and
              the arrows at the foot, over the barcode and "Fermer". */}
          <div className="flex flex-wrap gap-2 sm:contents">
            {project.href && (
              <a
                href={project.href}
                className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-accent px-3 font-mono text-xs tracking-wide whitespace-nowrap text-on-accent uppercase transition hover:text-on-accent hover:brightness-110 sm:flex-none"
              >
                Voir en ligne ↗
              </a>
            )}
            <nav
              aria-label="Autres projets"
              className="order-first flex w-full items-center justify-between gap-1 sm:order-none sm:mt-auto"
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
            <button
              type="button"
              autoFocus
              onClick={close}
              className="min-h-11 flex-1 rounded-full border border-foreground/40 px-4 font-mono text-xs tracking-wider uppercase transition hover:bg-foreground/10 sm:order-last sm:flex-none"
            >
              Fermer
            </button>
          </div>

          {/* Printed barcode, near the foot of the stub. */}
          <span
            aria-hidden="true"
            className="hidden h-8 shrink-0 opacity-60 barcode sm:block"
          />
        </div>
      </div>

      {viewing !== null && (
        <ImageViewer
          title={project.title}
          images={images}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
        />
      )}
    </dialog>
  );
}

// A screenshot shown large, with arrows through the project's others. A
// modal <dialog> of its own, over the ticket in the top layer: Escape
// closes it alone, and focus goes back to its thumbnail.
function ImageViewer({
  title,
  images,
  index,
  onIndex,
  onClose,
}: {
  title: string;
  images: string[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => dialogRef.current?.showModal(), []);
  const close = () => dialogRef.current?.close();
  const count = images.length;
  const go = (step: number) => onIndex((index + step + count) % count);

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${title} : captures`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
      // As wide as fits, with the caption, on a short screen too.
      className="m-auto w-[min(48rem,calc(100%-2rem),calc((100dvh-9rem)*16/9))] overflow-visible border-0 bg-transparent p-0 text-foreground transition duration-300 backdrop:bg-black/85 starting:scale-95 starting:opacity-0"
    >
      <figure className="rounded-xl bg-background p-2 shadow-2xl sm:p-3">
        {/* Keyed on the image, so the next one fades in. Whole, whatever
            its shape. */}
        <Image
          key={images[index]}
          src={images[index]}
          alt={`${title}, capture ${index + 1} sur ${count}`}
          width={640}
          height={360}
          sizes="(min-width: 800px) 768px, 100vw"
          className="aspect-video w-full rounded-md bg-foreground/5 object-contain transition duration-300 starting:opacity-0"
        />
        <figcaption className="flex items-center gap-2 pt-2 pl-1 sm:pt-3">
          <p className="mr-auto min-w-0">
            <span className="block truncate font-extrabold tracking-tight uppercase">
              {title}
            </span>
            <span
              aria-live="polite"
              className="font-mono text-xs text-muted tabular-nums"
            >
              Capture {pad(index + 1)} / {pad(count)}
            </span>
          </p>
          {count > 1 && (
            <>
              <StepButton label="Capture précédente" onClick={() => go(-1)}>
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </StepButton>
              <StepButton label="Capture suivante" onClick={() => go(1)}>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </StepButton>
            </>
          )}
          <button
            type="button"
            autoFocus
            onClick={close}
            className="min-h-11 rounded-full border border-foreground/40 px-4 font-mono text-xs tracking-wider uppercase transition hover:bg-foreground/10"
          >
            Fermer
          </button>
        </figcaption>
      </figure>
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
