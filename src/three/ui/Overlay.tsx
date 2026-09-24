import { useState } from "react";
import Link from "next/link";
import { useTrainContext } from "../state/TrainContext";
import { departureTime, trainLine } from "../config/departures";
import AboutPanel from "./AboutPanel";
import DeparturesBoard from "./DeparturesBoard";
import ProjectDialog from "./ProjectDialog";
import type { StationProject } from "./types";

// HTML layer over the canvas. The current mode picks the panel: the about
// card with the driver, the departures board's HTML twin at the station, and
// a project's dialog once a row is picked (on either board). The top bar
// doubles the 3D navigation planks for keyboard and screen readers.
export default function Overlay({ projects }: { projects: StationProject[] }) {
  const {
    cameraControlsRef,
    mode,
    setMode,
    selectedSlug,
    setSelectedSlug,
    setBoardFocused,
  } = useTrainContext();
  const selectedIndex = projects.findIndex((p) => p.slug === selectedSlug);
  const selected = projects[selectedIndex];
  const riding = mode === "ride";
  // Set when "Projets" was pressed from the keyboard, so the HTML board
  // takes focus on arrival (and shows up on larger screens, see
  // DeparturesBoard). A mouse or the 3D plank leaves the 3D board in charge.
  const [keyboardArrival, setKeyboardArrival] = useState(false);
  const depart = () => {
    setSelectedSlug(null);
    setBoardFocused(false);
    setKeyboardArrival(false);
    setMode("departing");
  };

  return (
    <div className="pointer-events-none absolute inset-0 text-sm text-white">
      <div className="flex flex-wrap items-start justify-between gap-2 p-5">
        <Link href="/" className="pointer-events-auto underline">
          ← Accueil
        </Link>
        <nav aria-label="Voyage" className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!riding}
            onClick={(e) => {
              // A click fired by Enter/Space has no pointer press count.
              setKeyboardArrival(e.detail === 0);
              setMode("arriving");
            }}
            className="pointer-events-auto min-h-11 rounded-full border border-white/40 px-3 hover:bg-white/10 disabled:opacity-50"
          >
            Projets
          </button>
          <button
            type="button"
            disabled={!riding}
            onClick={() => setMode("about")}
            className="pointer-events-auto min-h-11 rounded-full border border-white/40 px-3 hover:bg-white/10 disabled:opacity-50"
          >
            À propos
          </button>
          {/* The 3D board has no "leave" control of its own. */}
          {mode === "station" && (
            <button
              type="button"
              onClick={depart}
              className="pointer-events-auto min-h-11 rounded-full border border-white/40 px-3 hover:bg-white/10"
            >
              Repartir
            </button>
          )}
          <button
            type="button"
            onClick={() => cameraControlsRef.current?.reset(true)}
            className="pointer-events-auto min-h-11 rounded-full border border-white/40 px-3 hover:bg-white/10"
          >
            Recentrer la vue
          </button>
        </nav>
      </div>

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
