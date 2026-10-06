import { useEffect, useRef, useState, type ReactNode } from "react";
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

// Swapping the ride's tickets for a screen's and back: the shown ones are
// gathered away one after the other (GATHER_MS apart), the others dealt in
// (after RIDE_DEAL_MS, or STOP_DEAL_MS once the camera has settled on a
// screen, then DEAL_MS apart). In ms.
const DEAL_MS = 120;
const GATHER_MS = 50;
const RIDE_DEAL_MS = 300;
const STOP_DEAL_MS = 700;
// At the station, "Voir les projets" and "Fermer" swap places as the board
// opens and closes: one dealt this long after the other starts going.
const SWAP_MS = 150;

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
// home), then the navigation as train tickets at the bottom. The ride is
// its hub: there, one big ticket per screen; on a screen, only small ones,
// the way back to the ride, and at the station one into the 3D board. One
// set is gathered away as the other is dealt. On phones, a screen's panel
// has its own buttons instead. The current mode and stop also pick the
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
  // Set when "Mes projets" was pressed from the keyboard, so the HTML board
  // takes focus on arrival (and shows up on larger screens, see
  // DeparturesBoard). A mouse leaves the 3D board in charge.
  const [keyboardArrival, setKeyboardArrival] = useState(false);
  const depart = () => {
    setSelectedSlug(null);
    setBoardFocused(false);
    setKeyboardArrival(false);
    setMode("departing");
  };
  const riding = mode === "ride";
  const atStation = mode === "stopped" && stop === "station";
  const atHome = mode === "stopped" && stop === "home";
  const inWorkshop = mode === "custom";
  // Once the board has been open at this stop, "Voir les projets" comes
  // back as a swap with "Fermer", not after the arrival's wait. Kept from
  // render to render while the train waits there (React's way to adjust
  // state to a change, without an effect).
  const [boardOpened, setBoardOpened] = useState(false);
  if (atStation && boardFocused && !boardOpened) setBoardOpened(true);
  if (!atStation && boardOpened) setBoardOpened(false);
  const seeProjectsRef = useRef<HTMLButtonElement>(null);

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
          className="theme-ticket pointer-events-auto rounded-md border border-line bg-background px-4 py-1.5 text-foreground shadow-lg hover:text-foreground"
        >
          <span className="block font-semibold tracking-tight">
            {site.name}
          </span>
          <span className="block font-mono text-[0.625rem] tracking-wider text-muted uppercase">
            {site.role}
          </span>
        </Link>
        <SeasonSwitch />
        <p aria-live="polite" className="sr-only">
          {STATUS[stop][mode]}
        </p>
      </header>

      {inWorkshop && <Workshop onLeave={() => setMode("ride")} />}

      {atHome && <AboutPanel onDepart={depart} />}

      {/* After the about card and the workshop's (tab order), before the
          departures board's HTML twin (drawn over it). Both rows sit at
          the bottom of the screen, over each other. */}
      <nav aria-label="Voyage" className="absolute inset-x-0 bottom-0">
        {/* On a screen, larger screens only (on phones, its panel has the
            way back): a small return ticket, and at the station a small
            outbound one beside it, into the 3D board (a click on it, or its
            arrow, works too), swapped for "Fermer" while it's open, back
            out to the station. The two share a slot, as wide as the wider,
            so "Retour" doesn't move. Beside the about card and the
            workshop's, centred in the room they leave (their width and
            right margin). */}
        <div
          className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 p-4 pb-8 transition-[right] duration-500 ease-out max-sm:hidden ${atHome || inWorkshop ? "right-[25.25rem]" : ""}`}
        >
          <Dealt
            shown={atStation || atHome || inWorkshop}
            delay={STOP_DEAL_MS + (atStation ? DEAL_MS : 0)}
          >
            <Ticket
              kicker="Billet · Retour"
              title="Retour"
              tilt={1}
              delay={0}
              variant="return"
              size="mini"
              onClick={inWorkshop ? () => setMode("ride") : depart}
            />
          </Dealt>
          {/* Mounted while the station is the stop, so they're gathered
              away as the train departs rather than gone at once. */}
          {stop === "station" && (
            <div className="grid justify-items-start">
              <Dealt
                shown={atStation && !boardFocused && !selected}
                delay={boardOpened ? SWAP_MS : STOP_DEAL_MS}
                className="[grid-area:1/1]"
              >
                <Ticket
                  ref={seeProjectsRef}
                  kicker="Billet · Aller simple"
                  title="Voir les projets"
                  tilt={-1.5}
                  delay={0}
                  size="mini"
                  onClick={(e) => {
                    setBoardFocused(true);
                    // From the keyboard, hand over to the HTML board (see
                    // DeparturesBoard), which shows up once it holds focus.
                    if (e.detail === 0) {
                      document.getElementById("departures-title")?.focus();
                    }
                  }}
                />
              </Dealt>
              <Dealt
                shown={atStation && boardFocused && !selected}
                delay={SWAP_MS}
                className="[grid-area:1/1]"
              >
                <Ticket
                  kicker="Billet · Retour en gare"
                  title="Fermer"
                  tilt={-1}
                  delay={0}
                  size="mini"
                  icon="close"
                  onClick={(e) => {
                    setBoardFocused(false);
                    // From the keyboard, back on "Voir les projets" once
                    // it's dealt in again (visible, so focusable, a little
                    // after its delay).
                    if (e.detail === 0) {
                      setTimeout(
                        () => seeProjectsRef.current?.focus(),
                        SWAP_MS + 50,
                      );
                    }
                  }}
                />
              </Dealt>
            </div>
          )}
        </div>

        {/* On the ride, one big ticket per screen. */}
        <div
          inert={!riding}
          className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 sm:flex-row sm:justify-center sm:gap-6 sm:pb-8"
        >
          <Dealt
            shown={riding}
            delay={RIDE_DEAL_MS}
            className="w-full max-w-72 sm:w-auto"
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
          </Dealt>
          <Dealt
            shown={riding}
            delay={RIDE_DEAL_MS + DEAL_MS}
            gather={GATHER_MS}
            className="w-full max-w-72 sm:w-auto"
          >
            <Ticket
              kicker="Billet · Aller simple"
              title="Qui suis-je ?"
              tilt={1.5}
              delay={DEAL_MS}
              onClick={() => {
                setStop("home");
                setMode("arriving");
              }}
            />
          </Dealt>
          <Dealt
            shown={riding}
            delay={RIDE_DEAL_MS + 2 * DEAL_MS}
            gather={2 * GATHER_MS}
            className="w-full max-w-72 sm:w-auto"
          >
            <Ticket
              kicker="Billet · Personnaliser"
              title="L'atelier"
              tilt={-1}
              delay={2 * DEAL_MS}
              onClick={() => setMode("custom")}
            />
          </Dealt>
        </div>
      </nav>

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
          projects={projects}
          slug={selected.slug}
          onSelect={setSelectedSlug}
          onClose={() => setSelectedSlug(null)}
        />
      )}
    </div>
  );
}

// A ticket dealt in (rising from its foot) or gathered away (sinking and
// shrinking), after `delay` or `gather` ms. Hidden, it can't be reached.
function Dealt({
  shown,
  delay,
  gather = 0,
  className = "",
  children,
}: {
  shown: boolean;
  delay: number;
  gather?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{ transitionDelay: `${shown ? delay : gather}ms` }}
      className={`origin-bottom transition-[opacity,scale,translate,visibility] duration-300 ease-out ${shown ? "" : "invisible translate-y-4 scale-90 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}
