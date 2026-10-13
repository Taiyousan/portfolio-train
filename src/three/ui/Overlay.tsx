import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import NameCard from "@/components/NameCard";
import Ticket from "@/components/Ticket";
import {
  useTrainContext,
  type Stop,
  type TrainMode,
} from "../state/TrainContext";
import AboutPanel from "./AboutPanel";
import DeparturesBoard from "./DeparturesBoard";
import LegalDialog from "./LegalDialog";
import ProjectDialog from "./ProjectDialog";
import SeasonSwitch from "./SeasonSwitch";
import Workshop from "./Workshop";
import type { LegalNotice, StationProject } from "./types";

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

// HTML layer over the canvas: the name in the corner, the season switch,
// and the navigation as train tickets at the bottom. The ride is the hub:
// there, one big ticket per screen; on a screen, small ones back to the
// ride (and at the station, into the 3D board). The mode and stop also
// pick the panel: the about card at home, the departures board's HTML twin
// and a project's dialog at the station, the workshop in "custom" mode.
// Out of reach under the loading screen; the ride's tickets are dealt once
// it fades out (`boarded`).
export default function Overlay({
  projects,
  legal,
  boarded,
}: {
  projects: StationProject[];
  legal: LegalNotice;
  boarded: boolean;
}) {
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
  // takes focus on arrival (and shows up, see DeparturesBoard). A mouse or
  // a finger leaves the 3D board in charge.
  const [keyboardArrival, setKeyboardArrival] = useState(false);
  const depart = () => {
    setSelectedSlug(null);
    setBoardFocused(false);
    setKeyboardArrival(false);
    setMode("departing");
  };
  const riding = mode === "ride" && boarded;
  const atStation = mode === "stopped" && stop === "station";
  const atHome = mode === "stopped" && stop === "home";
  const inWorkshop = mode === "custom";
  // Once the board has been open at this stop, "Voir les projets" comes
  // back as a swap with "Fermer", not after the arrival's wait (state
  // adjusted while rendering, without an effect).
  const [boardOpened, setBoardOpened] = useState(false);
  if (atStation && boardFocused && !boardOpened) setBoardOpened(true);
  if (!atStation && boardOpened) setBoardOpened(false);
  const seeProjectsRef = useRef<HTMLButtonElement>(null);

  // The legal notice's links open it over the scene, unless it's wanted
  // elsewhere (new tab or window): its page would reload the scene.
  const [legalOpen, setLegalOpen] = useState(false);
  const openLegal = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    setLegalOpen(true);
  };

  // Escape leaves the workshop, as the return tickets do.
  useEffect(() => {
    if (mode !== "custom") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("ride");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, setMode]);

  return (
    <div
      inert={!boarded}
      className="pointer-events-none absolute inset-0 text-sm text-white"
    >
      {/* Wrapping on the narrowest phones, the season switch kept right. */}
      <header className="flex flex-wrap items-start justify-between gap-3 p-3 sm:p-5 short:p-3">
        <NameCard />
        <SeasonSwitch />
        <p aria-live="polite" className="sr-only">
          {STATUS[stop][mode]}
        </p>
      </header>

      {/* The small print, in a bottom corner throughout, under the tickets'
          room (pb-11 below). Before the panels, so their sheets cover it on
          phones; left out on short screens, where the room isn't there
          (the about card has it too). */}
      <Link
        href="/mentions-legales"
        onClick={openLegal}
        className="group pointer-events-auto absolute right-3 bottom-0 flex min-h-11 items-end pb-2 sm:right-5 short:hidden"
      >
        <span className="theme-ticket rounded-sm bg-background/85 px-2 py-1 font-mono text-[0.625rem] tracking-wider text-muted uppercase shadow transition group-hover:text-foreground">
          Mentions légales
        </span>
      </Link>

      {inWorkshop && <Workshop onLeave={() => setMode("ride")} />}

      {atHome && <AboutPanel onDepart={depart} onLegal={openLegal} />}

      {/* After the about card and the workshop (tab order), before the
          departures board's HTML twin (drawn over it). */}
      <nav aria-label="Voyage" className="absolute inset-0">
        {/* On a screen: a small return ticket (on phones, the about card and
            the workshop have their own), and at the station "Voir les
            projets" into the 3D board, swapped for "Fermer" while it's
            open. The two share a slot so "Retour" doesn't move. Beside a
            side panel, centred in the room it leaves. */}
        <div
          className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 p-4 pb-11 transition-[right] duration-500 ease-out short:pb-4 ${atHome || inWorkshop ? "right-[25.25rem] max-sm:hidden" : ""}`}
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
              away as the train departs. */}
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
                    // From the keyboard, on to the HTML board, which shows
                    // up once it holds focus.
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
                    // it's dealt in again (focusable once visible).
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

        {/* On the ride, one big ticket per screen: stacked under the train
            on phones, in a row past them, narrowing to fit. */}
        <div
          inert={!riding}
          className="absolute inset-x-0 top-[58%] bottom-0 flex flex-col items-center justify-center gap-6 p-4 pb-11 sm:top-auto sm:flex-row sm:gap-3 sm:px-3 lg:gap-6 short:pb-4"
        >
          <Dealt
            shown={riding}
            delay={RIDE_DEAL_MS}
            className="w-full max-w-56 sm:max-w-72 sm:min-w-0 sm:flex-1"
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
            className="w-full max-w-56 sm:max-w-72 sm:min-w-0 sm:flex-1"
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
            className="w-full max-w-56 sm:max-w-72 sm:min-w-0 sm:flex-1"
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

      {legalOpen && (
        <LegalDialog legal={legal} onClose={() => setLegalOpen(false)} />
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
