import { useEffect, useRef, useState, type ReactNode } from "react";
import { site } from "@/lib/site";
import { OUTFITS } from "../config/livery";
import { useLivery } from "../state/LiveryContext";
import FlapText from "./FlapText";
import { DriverIcon } from "./LiveryIcons";
import Ticket from "./Ticket";

// Field labels and section titles, as on the project ticket.
const LABEL = "font-mono text-[0.625rem] tracking-[0.2em] uppercase";

// A swipe on the sheet's header further than this, in pixels, raises or
// lowers it; any less is a tap, which toggles it.
const SWIPE_PX = 24;

const CONTACTS = [
  { label: "Email", href: `mailto:${site.links.email}` },
  { label: "CV (PDF)", href: site.links.cv },
  { label: "GitHub", href: site.links.github },
  { label: "LinkedIn", href: site.links.linkedin },
];

// "About" panel, shown while the train waits at home, beside the driver at
// the desk. Dressed as a railcard, like the workshop's work order: a
// split-flap strip with the name, in the card's ink like the project
// ticket's band, then card stock below a perforation (.theme-ticket), the
// driver's portrait as the holder's photo, in the hoodie worn at the desk
// beside it (see models/Home). The look is the railcard's, the text stays
// plain. A side card on larger screens. On phones, a bottom sheet with the
// return ticket riding on top of it (Overlay's is left out there), lowered
// to leave the scene in view: it rises to take most of the screen once its
// text is scrolled, or with a tap or a swipe up on its header, which lower
// it again. Escape sets off again too.
export default function AboutPanel({ onDepart }: { onDepart: () => void }) {
  const { outfit: picked } = useLivery();
  const outfit = picked.style === "hoodie" ? picked : OUTFITS.hoodie;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  // Phones only: the sheet raised.
  const [raised, setRaised] = useState(false);
  const swipeFrom = useRef<number | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  // Lowered, the sheet shows its top again: and its text, scrolled back,
  // won't raise it straight away.
  const raise = (up: boolean) => {
    if (!up) textRef.current?.scrollTo({ top: 0 });
    setRaised(up);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDepart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDepart]);

  return (
    <section
      aria-labelledby="about-title"
      // Dealt in after the camera has moved, raised and lowered at once.
      className={`theme-ticket pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col text-foreground drop-shadow-2xl [transition:translate_500ms_ease-out_500ms,opacity_500ms_ease-out_500ms,max-height_300ms_ease-out] starting:translate-y-6 starting:opacity-0 sm:inset-x-auto ${raised ? "max-h-[calc(100dvh-8rem)]" : "max-h-[45dvh]"} sm:top-20 sm:right-5 sm:bottom-auto sm:max-h-[calc(100dvh-7rem)] sm:short:top-16 sm:short:max-h-[calc(100dvh-5rem)] sm:w-96`}
    >
      {/* Split-flap header, in the card's ink. */}
      <header className="notch-bottom relative shrink-0 rounded-t-xl bg-foreground px-5 pt-4 pb-4 text-background">
        {/* On phones, the whole header raises and lowers the sheet, a
            grab bar on top and its action spelled out on the right. */}
        <button
          type="button"
          aria-expanded={raised}
          aria-label={raised ? "Replier le panneau" : "Déplier le panneau"}
          onPointerDown={(e) => {
            swipeFrom.current = e.clientY;
          }}
          onPointerUp={(e) => {
            if (swipeFrom.current === null) return;
            const dy = e.clientY - swipeFrom.current;
            swipeFrom.current = null;
            raise(Math.abs(dy) < SWIPE_PX ? !raised : dy < 0);
          }}
          onPointerCancel={() => {
            swipeFrom.current = null;
          }}
          // A pointer's tap is handled on release, the keyboard's here.
          onClick={(e) => {
            if (e.detail === 0) raise(!raised);
          }}
          className="absolute inset-0 z-10 flex touch-none justify-center rounded-t-xl pt-1.5 outline-offset-[-4px] outline-background focus-visible:outline-2 sm:hidden"
        >
          <span
            aria-hidden="true"
            className="h-1 w-10 rounded-full bg-background/40"
          />
          <span
            aria-hidden="true"
            className={`${LABEL} absolute top-4 right-5 flex items-center gap-1 opacity-80`}
          >
            {raised ? "Replier" : "Déplier"}
            <svg
              viewBox="0 0 24 24"
              className={`size-3.5 transition ${raised ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 15 6-6 6 6" />
            </svg>
          </span>
        </button>
        <p className={`${LABEL} opacity-80`}>À propos</p>
        <h2
          id="about-title"
          ref={headingRef}
          tabIndex={-1}
          className="relative mt-1 font-mono text-2xl font-semibold tracking-wide uppercase outline-none"
        >
          <FlapText text={site.name} />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-px bg-board"
          />
        </h2>
      </header>

      {/* Card stock, past the perforation. Only it scrolls. */}
      <div
        ref={textRef}
        onScroll={(e) => {
          if (!raised && e.currentTarget.scrollTop > 0) setRaised(true);
        }}
        className="notch-top scrollbar-ink min-h-0 overflow-y-auto border-t-2 border-dashed border-ticket-ink/30 bg-background px-5 pt-5 pb-6 sm:rounded-b-xl"
      >
        <div className="flex items-start gap-4">
          {/* The holder's photo, stamped in a corner. */}
          <div className="relative shrink-0">
            <div className="w-20 overflow-hidden rounded-md border-2 border-line bg-accent/10">
              <DriverIcon
                outfit={outfit}
                className="block aspect-square w-full translate-y-1"
              />
            </div>
            <span
              aria-hidden="true"
              className="absolute -right-2 -bottom-2 size-7 -rotate-12 rounded-full border-2 border-dashed border-accent/70"
            />
          </div>
          <dl className="grid min-w-0 flex-1 gap-y-2">
            <Field label="Métier">{site.role}</Field>
            <Field label="Ville">{site.city}</Field>
          </dl>
        </div>

        <div className="mt-5 space-y-2 leading-relaxed">
          {site.intro.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="mt-2 text-muted">{site.education}</p>

        {/* The skills as stops on a line, like the project's missions. */}
        <h3 className={`${LABEL} mt-6 font-normal text-muted`}>Compétences</h3>
        <dl className="mt-3 ml-1.5 space-y-3 border-l-2 border-dotted border-foreground/30 pl-5">
          {site.skills.map((group) => (
            <div
              key={group.label}
              className="relative before:absolute before:top-[3px] before:-left-6 before:size-2.5 before:rounded-full before:border-2 before:border-accent before:bg-background"
            >
              <dt className={`${LABEL} text-muted`}>{group.label}</dt>
              <dd className="mt-0.5 font-semibold">
                {group.items.join(" · ")}
              </dd>
            </div>
          ))}
        </dl>

        <h3 className={`${LABEL} mt-6 font-normal text-muted`}>Contact</h3>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {CONTACTS.map(({ label, href }, i) => (
            <li key={label}>
              <a
                href={href}
                className={`flex min-h-11 items-center justify-center rounded-full px-3 font-mono text-xs tracking-wider whitespace-nowrap uppercase transition ${i === 0 ? "bg-accent text-on-accent hover:text-on-accent hover:brightness-110" : "border border-foreground/40 hover:bg-foreground/10 hover:text-foreground"}`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* Printed barcode. */}
        <span
          aria-hidden="true"
          className="barcode mt-6 block h-8 opacity-60"
        />
      </div>

      {/* On phones, the way back, riding on top of the sheet. */}
      <div className="absolute bottom-full left-4 mb-3 w-max sm:hidden">
        <Ticket
          kicker="Billet · Retour"
          title="Retour"
          tilt={1}
          delay={0}
          variant="return"
          size="mini"
          onClick={onDepart}
        />
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className={`${LABEL} text-muted`}>{label}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}
