import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import WholeWords from "@/components/WholeWords";
import type { StationProject } from "./types";

type Props = {
  projects: StationProject[];
  slug: string;
  // Shows another project in the same dialog.
  onSelect: (slug: string) => void;
  onClose: () => void;
};

// Field labels and the header band: small, but read without effort.
const LABEL = "font-mono text-[0.6875rem] tracking-[0.12em] uppercase";

// Screenshots the stub has room for.
const MAX_IMAGES = 3;

// A project page's path, as written in the MDX bodies' links.
const PROJECT_PATH = /^\/projets\/([^/]+)\/?$/;

const ARROW = "M5 12h14M13 6l6 6-6 6";
const BACK_ARROW = "M19 12H5M11 6l-6 6 6 6";

const pad = (n: number) => String(n).padStart(2, "0");

// A project's detail over the scene, shaped like a train ticket: a stub
// with the screenshots, then the details on card stock past a perforation
// (on phones, the details on top, the stub below). Only the details
// scroll, so the notches stay put. A native modal <dialog>: focus trap,
// Escape and focus return come for free. It stays open from one project to
// the next (the arrows at the details' foot, or a project link in the
// text).
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
  // The screenshot shown large in the stub, back to the first with each
  // project.
  const [shown, setShown] = useState({ slug, index: 0 });
  const current = shown.slug === slug ? shown.index : 0;
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

  // A thumbnail shows its screenshot large in the stub; on phones, where
  // there's no room for it, it opens the viewer.
  const pick = (i: number) => {
    if (window.matchMedia("(min-width: 40rem)").matches) {
      setShown({ slug, index: i });
    } else {
      setViewing(i);
    }
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
      className="theme-ticket pointer-events-auto m-auto h-[90dvh] w-[min(64rem,calc(100%-2rem))] flex-col overflow-visible border-0 bg-transparent p-0 text-foreground drop-shadow-2xl transition duration-300 backdrop:bg-black/70 open:flex sm:h-[min(34rem,90dvh)] sm:flex-row starting:translate-y-6 starting:-rotate-1 starting:opacity-0"
    >
      {/* The details. */}
      <div className="flex min-h-0 flex-1 flex-col rounded-t-xl bg-background notch-bottom sm:order-last sm:rounded-tl-none sm:rounded-r-xl sm:notch-left">
        <header
          className={`${LABEL} flex h-11 shrink-0 items-center justify-between gap-4 rounded-t-xl bg-foreground pr-1.5 pl-6 text-background sm:rounded-tl-none sm:pl-8`}
        >
          <p>
            {project.type === "pro" ? "Projet pro" : "Projet perso"}
            {project.year && ` · ${project.year}`}
          </p>
          <button
            type="button"
            autoFocus
            onClick={close}
            className="flex h-8 items-center gap-1.5 rounded-full px-3 tracking-wider uppercase outline-offset-2 outline-background transition hover:bg-background/15 focus-visible:outline-2"
          >
            Fermer
            <Icon path="M6 6l12 12M18 6 6 18" className="size-3.5" />
          </button>
        </header>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        {/* Inset, so the scrollbar keeps clear of the frame's edge. Keyed
            on the project: the next one slides in, scrolled to the top. */}
        <div
          key={project.slug}
          onClick={onTextClick}
          className="my-2 mr-1.5 min-h-0 scrollbar-ink flex-1 overflow-y-auto pt-3 pr-[calc(1.5rem-0.375rem)] pb-5 pl-6 transition duration-300 sm:mr-2 sm:pr-6 sm:pl-8 starting:translate-x-3 starting:opacity-0"
        >
          <h2
            id="project-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-3xl leading-tight font-extrabold tracking-tight text-balance outline-none sm:text-4xl"
          >
            <WholeWords text={project.title} />
          </h2>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-4">
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
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {project.technos.map((techno) => (
                  <li
                    key={techno}
                    className="rounded-full border border-line bg-foreground/5 px-2.5 py-0.5 font-mono text-xs font-normal"
                  >
                    {techno}
                  </li>
                ))}
              </ul>
            </Field>
          </dl>

          {/* The summary, the body's detail under it, smaller. */}
          <p className="mt-6 text-lg leading-snug font-medium text-pretty">
            {project.summary}
          </p>
          <div className="mt-2 space-y-2 text-[0.9375rem] leading-relaxed text-muted [&_a]:font-semibold [&_a]:text-foreground [&_a]:underline [&_a]:decoration-accent [&_a]:decoration-2">
            {project.body}
          </div>

          <h3 className={`${LABEL} mt-7 font-normal text-muted`}>Missions</h3>
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

        <nav
          aria-label="Autres projets"
          className="mx-6 flex shrink-0 items-center justify-between gap-3 border-t border-line py-3 sm:mx-8"
        >
          <RoundButton
            label={`Projet précédent : ${previous.title}`}
            path={BACK_ARROW}
            onClick={() => step(previous)}
          />
          <span
            aria-hidden="true"
            className="font-mono text-xs whitespace-nowrap tabular-nums"
          >
            {pad(index + 1)} / {pad(projects.length)}
          </span>
          <RoundButton
            label={`Projet suivant : ${next.title}`}
            path={ARROW}
            onClick={() => step(next)}
          />
        </nav>
      </div>

      {/* The stub, before the perforation, tinted like the buttons' stubs:
          the screenshot shown large over its thumbnails (the thumbnails
          alone on phones), then the project's link. Left out when there's
          neither. */}
      {(images.length > 0 || project.href) && (
        <div className="flex shrink-0 flex-col rounded-b-xl border-t-2 border-dashed border-foreground/25 bg-background bg-linear-to-b from-accent/10 to-accent/10 notch-top sm:w-1/2 sm:shrink sm:rounded-l-xl sm:rounded-br-none sm:border-t-0 sm:border-r-2 sm:notch-right">
          {/* The details' band runs on across the stub. */}
          <span
            aria-hidden="true"
            className="hidden h-11 shrink-0 rounded-tl-xl bg-foreground sm:block"
          />
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-4 sm:p-5">
            {images.length > 0 && (
              <button
                type="button"
                aria-label={`Agrandir la capture ${current + 1} sur ${images.length}`}
                onClick={() => setViewing(current)}
                className="relative hidden aspect-video shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-foreground/15 bg-foreground/5 transition hover:border-accent sm:block short:aspect-auto short:min-h-0 short:flex-1"
              >
                {/* Keyed on the image, so the next one fades in. On short
                    screens, cropped to the room the stub has left. */}
                <Image
                  key={images[current]}
                  src={images[current]}
                  alt=""
                  fill
                  sizes="(min-width: 64rem) 470px, 46vw"
                  className="object-cover transition duration-300 starting:opacity-0"
                />
              </button>
            )}
            {images.length > 0 && (
              <ul
                key={project.slug}
                aria-label="Captures"
                className={`grid grid-cols-3 gap-2 transition duration-300 starting:opacity-0 short:hidden ${images.length < 2 ? "sm:hidden" : ""}`}
              >
                {images.map((src, i) => (
                  <li key={src}>
                    <button
                      type="button"
                      aria-label={`Capture ${i + 1} sur ${images.length}`}
                      aria-current={i === current || undefined}
                      onClick={() => pick(i)}
                      className={`block w-full overflow-hidden rounded-md border border-foreground/15 transition hover:border-accent ${i === current ? "sm:border-accent sm:ring-1 sm:ring-accent" : "sm:opacity-70 sm:hover:opacity-100"}`}
                    >
                      <Image
                        src={src}
                        alt=""
                        width={640}
                        height={360}
                        sizes="(min-width: 64rem) 140px, (min-width: 40rem) 13vw, calc(33vw - 32px)"
                        className="aspect-video w-full object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {/* At the stub's foot, level with the arrows across the
                perforation. */}
            {project.href && (
              <a
                href={project.href}
                className="flex min-h-11 items-center justify-center rounded-full bg-accent px-5 font-mono text-xs tracking-wide whitespace-nowrap text-on-accent uppercase transition hover:text-on-accent hover:brightness-110 sm:mt-auto sm:self-end"
              >
                Voir en ligne ↗
              </a>
            )}
          </div>
        </div>
      )}

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
// closes it alone, and focus goes back to what opened it.
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
      className="m-auto w-[min(56rem,calc(100%-2rem),calc((100dvh-9rem)*16/9))] overflow-visible border-0 bg-transparent p-0 text-foreground transition duration-300 backdrop:bg-black/85 starting:scale-95 starting:opacity-0"
    >
      <figure className="rounded-xl bg-background p-2 shadow-2xl sm:p-3">
        {/* Keyed on the image, so the next one fades in. Whole, whatever
            its shape. */}
        <Image
          key={images[index]}
          src={images[index]}
          alt={`${title}, capture ${index + 1} sur ${count}`}
          width={1280}
          height={720}
          sizes="(min-width: 58rem) 872px, 100vw"
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
              <RoundButton
                label="Capture précédente"
                path={BACK_ARROW}
                onClick={() => go(-1)}
              />
              <RoundButton
                label="Capture suivante"
                path={ARROW}
                onClick={() => go(1)}
              />
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

// The round arrows, through the projects and the screenshots.
function RoundButton({
  label,
  path,
  onClick,
}: {
  label: string;
  path: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-foreground/40 transition hover:bg-foreground/10 active:scale-95"
    >
      <Icon path={path} />
    </button>
  );
}

function Icon({
  path,
  className = "size-5",
}: {
  path: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}
