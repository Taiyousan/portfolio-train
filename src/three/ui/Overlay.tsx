import { useEffect, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site";
import {
  useTrainContext,
  type Stop,
  type TrainMode,
} from "../state/TrainContext";
import AboutPanel from "./AboutPanel";
import DeparturesBoard from "./DeparturesBoard";
import ProjectDialog from "./ProjectDialog";
import SeasonSwitch from "./SeasonSwitch";
import Ticket from "./Ticket";
import Workshop from "./Workshop";
import type { StationProject } from "./types";

// Announced to screen readers as the journey moves on.
const STATUS: Record<Stop, Record<TrainMode, string>> = {
  station: {
    ride: "En route dans la forêt",
    arriving: "Arrivée en gare",
    stopped: "En gare, tableau des départs",
    departing: "Départ de la gare",
    custom: "À l'atelier : personnalisation du train et du conducteur",
  },
  home: {
    ride: "En route dans la forêt",
    arriving: "Arrivée à la maison",
    stopped: "À la maison",
    departing: "Départ de la maison",
    custom: "À l'atelier : personnalisation du train et du conducteur",
  },
};

// HTML layer over the canvas. The name in the corner (back to the site's
// home), then the navigation as train tickets at the bottom, only those that
// make sense where the train is. The current mode and stop also pick the
// panel: the about card at home, the departures board's HTML twin at the
// station, a project's dialog once a row is picked (on either board), and
// the workshop in "custom" mode.
export default function Overlay({ projects }: { projects: StationProject[] }) {
  const {
    mode,
    setMode,
    stop,
    setStop,
    selectedSlug,
    setSelectedSlug,
    boardFocused,
    setBoardFocused,
  } = useTrainContext();
  const selected = projects.find((p) => p.slug === selectedSlug);
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
  const atStation = mode === "stopped" && stop === "station";
  const atHome = mode === "stopped" && stop === "home";

  // Out of the workshop ("custom"): Escape, the return ticket or the
  // panel's own button go back to the ride.
  useEffect(() => {
    if (mode !== "custom") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("ride");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, setMode]);

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
        <SeasonSwitch />
        <p aria-live="polite" className="sr-only">
          {STATUS[stop][mode]}
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
              setStop("station");
              setMode("arriving");
            }}
          />
          <Ticket
            kicker="Billet · Aller simple"
            title="Qui suis-je ?"
            tilt={1.5}
            delay={120}
            onClick={() => {
              setStop("home");
              setMode("arriving");
            }}
          />
          <Ticket
            kicker="Billet · Personnaliser"
            title="L'atelier"
            tilt={-1}
            delay={240}
            onClick={() => setMode("custom")}
          />
        </nav>
      )}

      {mode === "custom" && <Workshop onLeave={() => setMode("ride")} />}

      {/* On larger screens, centred in the room the workshop's card leaves
          (its width and right margin); on phones, its sheet has the way
          back. */}
      {mode === "custom" && (
        <nav
          aria-label="Voyage"
          className="absolute bottom-0 left-0 hidden justify-center p-4 sm:right-[25.25rem] sm:flex sm:pb-8"
        >
          <Ticket
            kicker="Billet · Retour"
            title="Retour au voyage"
            tilt={1.5}
            delay={600}
            variant="return"
            onClick={() => setMode("ride")}
          />
        </nav>
      )}

      {/* At the station on larger screens: a way into the 3D board (a click
          on it works too), and the way out. Once the board is open, only
          the first one fades out, its slot kept so "Repartir" doesn't move.
          On phones, the HTML board's sheet has both. */}
      {atStation && !selected && (
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

      {atHome && <AboutPanel onDepart={depart} />}

      {atStation && (
        <DeparturesBoard
          projects={projects}
          autoFocus={keyboardArrival}
          onSelect={setSelectedSlug}
          onDepart={depart}
        />
      )}

      {atStation && selected && (
        <ProjectDialog
          key={selected.slug}
          project={selected}
          onClose={() => setSelectedSlug(null)}
        />
      )}
    </div>
  );
}
