import { useTrainContext } from "../state/TrainContext";
import { SEASONS, SEASON_LABELS, type Season } from "../config/seasons";

const ICONS: Record<Season, string> = {
  // Sun
  summer:
    "M12 4V2M12 22v-2M4 12H2M22 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  // Leaf
  autumn: "M5 19C5 10 10 5 19 5c0 9-5 14-14 14ZM5 19l8-8",
  // Snowflake
  winter:
    "M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5M3.9 10.5l2.8-1.2-.5-3M20.1 13.5l-2.8 1.2.5 3M3.9 13.5l2.8 1.2-.5 3M20.1 10.5l-2.8-1.2.5-3",
};

// Picks the scene's season, on card stock like the name card beside it.
// Icons alone, their names for screen readers and as tooltips.
export default function SeasonSwitch() {
  const { season, setSeason } = useTrainContext();

  return (
    <div
      role="group"
      aria-label="Saison"
      className="theme-ticket pointer-events-auto flex h-12 gap-1 rounded-md border border-line bg-background p-1 shadow-lg"
    >
      {SEASONS.map((option) => {
        const active = option === season;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            title={SEASON_LABELS[option]}
            onClick={() => setSeason(option)}
            className={`grid aspect-square h-full place-items-center rounded outline-offset-2 outline-foreground transition focus-visible:outline-2 ${active ? "bg-foreground text-background" : "text-foreground/70 hover:bg-line hover:text-foreground"}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={ICONS[option]} />
            </svg>
            <span className="sr-only">{SEASON_LABELS[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
