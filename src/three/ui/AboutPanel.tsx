import { useEffect, useRef } from "react";
import { site } from "@/lib/site";

// "About" panel, shown while the train waits at home, beside the driver at
// the desk: a side card on desktop, a bottom sheet on phones. Dressed in the
// departures board's palette (.theme-board), like the project dialog. Its
// button (or Escape) sets off again.
export default function AboutPanel({ onDepart }: { onDepart: () => void }) {
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
      className="theme-board pointer-events-auto absolute inset-x-0 bottom-0 max-h-[55dvh] overflow-y-auto rounded-t-xl border-4 border-b-0 border-board bg-background/95 p-6 text-foreground shadow-2xl sm:rounded-xl sm:border-b-4 transition delay-500 duration-500 starting:translate-y-6 starting:opacity-0 sm:inset-x-auto sm:top-20 sm:right-5 sm:bottom-auto sm:max-h-[calc(100dvh-7rem)] sm:w-96"
    >
      <p className="font-mono text-xs tracking-wider text-accent uppercase">
        À la maison
      </p>
      <h2
        id="about-title"
        ref={headingRef}
        tabIndex={-1}
        className="mt-1 text-2xl font-bold tracking-tight outline-none"
      >
        {site.name}
      </h2>
      <div className="mt-4 space-y-2">
        {site.intro.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <p className="mt-3 text-muted">{site.education}</p>

      <h3 className="mt-6 font-mono text-sm tracking-wider text-accent uppercase">
        Compétences
      </h3>
      <dl className="mt-2 space-y-2">
        {site.skills.map((group) => (
          <div key={group.label}>
            <dt className="font-mono text-sm text-muted">{group.label}</dt>
            <dd>{group.items.join(", ")}</dd>
          </div>
        ))}
      </dl>

      <nav
        aria-label="Contact"
        className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4"
      >
        <a href={`mailto:${site.links.email}`}>Email</a>
        <a href={site.links.github}>GitHub</a>
        <a href={site.links.linkedin}>LinkedIn</a>
        <a href={site.links.cv}>CV (PDF)</a>
      </nav>

      <button
        type="button"
        onClick={onDepart}
        className="mt-6 min-h-11 rounded-full border border-accent/60 px-4 font-mono text-xs text-accent uppercase hover:bg-line"
      >
        Repartir
      </button>
    </section>
  );
}
