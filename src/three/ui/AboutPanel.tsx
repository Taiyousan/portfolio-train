import { useEffect, useRef, type ReactNode } from "react";
import { site } from "@/lib/site";
import { OUTFITS } from "../config/livery";
import { useLivery } from "../state/LiveryContext";
import FlapText from "./FlapText";
import { DriverIcon } from "./LiveryIcons";

// Field labels and section titles, as on the project ticket.
const LABEL = "font-mono text-[0.625rem] tracking-[0.2em] uppercase";

const CONTACTS = [
  { label: "Email", href: `mailto:${site.links.email}` },
  { label: "CV (PDF)", href: site.links.cv },
  { label: "GitHub", href: site.links.github },
  { label: "LinkedIn", href: site.links.linkedin },
];

// "About" panel, shown while the train waits at home, beside the driver at
// the desk. Dressed as a railcard, like the workshop's work order: the
// departures board's split-flap strip with the name, then card stock below
// a perforation (.theme-ticket), the driver's portrait as the holder's
// photo, in the hoodie worn at the desk beside it (see models/Home). The
// look is the railcard's, the text stays plain. A side card on larger
// screens, a bottom sheet on phones, with its own way out there since the
// return ticket is left out (see Overlay). Escape sets off again too.
export default function AboutPanel({ onDepart }: { onDepart: () => void }) {
  const { outfit: picked } = useLivery();
  const outfit = picked.style === "hoodie" ? picked : OUTFITS.hoodie;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

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
      className="theme-ticket pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[55dvh] flex-col text-foreground drop-shadow-2xl transition delay-500 duration-500 starting:translate-y-6 starting:opacity-0 sm:inset-x-auto sm:top-20 sm:right-5 sm:bottom-auto sm:max-h-[calc(100dvh-7rem)] sm:w-96"
    >
      {/* Split-flap header, as on the board. */}
      <header className="notch-bottom shrink-0 rounded-t-xl bg-board-flap px-5 pt-4 pb-4 text-board-ink">
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
      <div className="notch-top scrollbar-ink min-h-0 overflow-y-auto border-t-2 border-dashed border-ticket-ink/30 bg-background px-5 pt-5 pb-6 sm:rounded-b-xl">
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

        <button
          type="button"
          onClick={onDepart}
          className="mt-6 min-h-11 w-full rounded-full border border-foreground/40 px-4 font-mono text-xs tracking-wider uppercase transition hover:bg-foreground/10 sm:hidden"
        >
          Repartir
        </button>
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
