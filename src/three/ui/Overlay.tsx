import { useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site";
import { useTrainContext, type TrainMode } from "../state/TrainContext";
import { departureTime, trainLine } from "../config/departures";
import AboutPanel from "./AboutPanel";
import DeparturesBoard from "./DeparturesBoard";
import ProjectDialog from "./ProjectDialog";
import Ticket from "./Ticket";
import type { StationProject } from "./types";

// Announced to screen readers as the journey moves on.
const STATUS: Record<TrainMode, string> = {
  ride: "En route dans la forêt",
  arriving: "Arrivée en gare",
  station: "En gare, tableau des départs",
  departing: "Départ de la gare",
  about: "Dans la cabine du conducteur",
};

// HTML layer over the canvas. The name in the corner (back to the site's
// home), then the navigation as train tickets at the bottom, only those that
// make sense where the train is. The current mode also picks the panel: the
// about card with the driver, the departures board's HTML twin at the
// station, and a project's dialog once a row is picked (on either board).
export default function Overlay({ projects }: { projects: StationProject[] }) {
  const {
    mode,
    setMode,
    selectedSlug,
    setSelectedSlug,
    boardFocused,
    setBoardFocused,
  } = useTrainContext();
  const selectedIndex = projects.findIndex((p) => p.slug === selectedSlug);
  const selected = projects[selectedIndex];
  // Set when "Projets" was pressed from the keyboard, so the HTML board
  // takes focus on arrival (and shows up on larger screens, see
  // DeparturesBoard). A mouse leaves the 3D board in charge.
  const [keyboardArrival, setKeyboardArrival] = useState(false);
  const depart = () => {
    setSelectedSlug(null);
    setBoardFocused(false);
    setKeyboardArrival(false);
    setMode("departing");
  };

  return (
    <div className="pointer-events-none absolute inset-0 text-sm text-white">
      <header className="flex items-start justify-between gap-3 p-3 sm:p-5">
        <Link
          href="/"
          className="pointer-events-auto rounded-2xl border border-board-flap bg-board/85 px-4 py-1.5 text-board-ink shadow-lg backdrop-blur-sm hover:text-board-ink"
        >
          <span className="block font-semibold tracking-tight">
            {site.name}
          </span>
          <span className="block font-mono text-[0.625rem] tracking-wider text-board-ink/60 uppercase">
            Développeur front-end
          </span>
        </Link>
        <p aria-live="polite" className="sr-only">
          {STATUS[mode]}
        </p>
      </header>

      {mode === "ride" && (
        <nav
          aria-label="Voyage"
          className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 sm:flex-row sm:justify-center sm:gap-6 sm:pb-8"
        >
          <Ticket
            kicker="Billet · Aller simple"
            title="Mes projets"
            tilt={-2}
            delay={0}
            onClick={(e) => {
              // A click fired by Enter/Space has no pointer press count.
              setKeyboardArrival(e.detail === 0);
              setMode("arriving");
            }}
          />
          <Ticket
            kicker="Billet · Aller simple"
            title="Qui suis-je ?"
            tilt={1.5}
            delay={120}
            onClick={() => setMode("about")}
          />
        </nav>
      )}

      {/* At the station on larger screens: a way into the 3D board (a click
          on it works too), and the way out. Once the board is open, only
          the first one fades out, its slot kept so "Repartir" doesn't move.
          On phones, the HTML board's sheet has both. */}
      {mode === "station" && !selected && (
        <nav
          aria-label="Voyage"
          className="absolute inset-x-0 bottom-0 hidden justify-center gap-6 pb-8 sm:flex"
        >
          <div
            className={`transition-[opacity,visibility] duration-300 ${boardFocused ? "invisible opacity-0" : ""}`}
          >
            <Ticket
              kicker="Billet · Aller simple"
              title="Voir les projets"
              tilt={-2}
              delay={900}
              onClick={(e) => {
                setBoardFocused(true);
                // From the keyboard, hand over to the HTML board (see
                // DeparturesBoard), which shows up once it holds focus.
                if (e.detail === 0) {
                  document.getElementById("departures-title")?.focus();
                }
              }}
            />
          </div>
          <Ticket
            kicker="Billet · Retour"
            title="Repartir"
            tilt={1.5}
            delay={1020}
            variant="return"
            onClick={depart}
          />
        </nav>
      )}

      {mode === "about" && <AboutPanel onClose={() => setMode("ride")} />}

      {mode === "station" && (
        <DeparturesBoard
          projects={projects}
          autoFocus={keyboardArrival}
          onSelect={setSelectedSlug}
          onDepart={depart}
        />
      )}

      {mode === "station" && selected && (
        <ProjectDialog
          key={selected.slug}
          project={selected}
          line={`${departureTime(selectedIndex)} · ${trainLine(selected.type)} · Voie ${selectedIndex + 1}`}
          onClose={() => setSelectedSlug(null)}
        />
      )}
    </div>
  );
}
