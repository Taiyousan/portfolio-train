import { useTrainContext } from "../state/TrainContext";
import { SEASONS, SEASON_LABELS, type Season } from "../config/seasons";

const ICONS: Record<Season, string> = {
  // Sun
  summer:
    "M12 4V2M12 22v-2M4 12H2M22 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  // Snowflake
  winter:
    "M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5M3.9 10.5l2.8-1.2-.5-3M20.1 13.5l-2.8 1.2.5 3M3.9 13.5l2.8 1.2-.5 3M20.1 10.5l-2.8-1.2.5-3",
};

// Picks the scene's season (see config/seasons), in the departures board's
// colours like the name card beside it. Only changes the look.
export default function SeasonSwitch() {
  const { season, setSeason } = useTrainContext();

  return (
    <div
      role="group"
      aria-label="Saison"
      className="pointer-events-auto flex gap-1 rounded-2xl border border-board-flap bg-board/85 p-1 shadow-lg backdrop-blur-sm"
    >
      {SEASONS.map((option) => {
        const active = option === season;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => setSeason(option)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-[0.625rem] tracking-wider uppercase transition outline-offset-2 outline-board-ink focus-visible:outline-2 ${active ? "bg-board-ink text-board" : "text-board-ink/70 hover:bg-board-flap hover:text-board-ink"}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={ICONS[option]} />
            </svg>
            {SEASON_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
