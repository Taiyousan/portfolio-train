import { useEffect, useRef } from "react";
import type { LegalNotice } from "./types";

// The legal notice over the scene, so the train is where it was once it's
// closed (its own page, /mentions-legales, would reload the scene on the
// way back). A native modal <dialog>: focus trap, Escape and focus return
// come for free.
export default function LegalDialog({
  legal,
  onClose,
}: {
  legal: LegalNotice;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => dialogRef.current?.showModal(), []);
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="legal-title"
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      // Escape closes the notice alone: kept from the panels' and the
      // board's own Escape, which listen on the window.
      onKeyDown={(e) => {
        if (e.key === "Escape") e.stopPropagation();
      }}
      className="theme-ticket pointer-events-auto m-auto max-h-[85dvh] w-[min(44rem,calc(100%-2rem))] flex-col overflow-hidden rounded-xl border-0 bg-background p-0 text-foreground shadow-2xl transition duration-300 backdrop:bg-black/70 open:flex starting:translate-y-6 starting:opacity-0"
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-6 py-4 sm:px-8">
        <h2 id="legal-title" className="text-2xl font-bold tracking-tight">
          {legal.title}
        </h2>
        <button
          type="button"
          autoFocus
          onClick={close}
          className="min-h-11 rounded-full border border-foreground/40 px-4 font-mono text-xs tracking-wider uppercase transition hover:bg-foreground/10"
        >
          Fermer
        </button>
      </header>
      <div className="min-h-0 scrollbar-ink overflow-y-auto px-6 pb-8 sm:px-8">
        {legal.body}
      </div>
    </dialog>
  );
}
