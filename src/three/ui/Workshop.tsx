import { useEffect, useId, useRef, type ReactNode } from "react";
import { useLivery } from "../state/LiveryContext";
import { useTrainContext, type WorkshopView } from "../state/TrainContext";
import {
  BODY_SWATCHES,
  BOTTOM_SWATCHES,
  DEFAULT_LIVERY,
  DEFAULT_OUTFIT,
  LIVERIES,
  OUTFITS,
  OUTFIT_LABELS,
  OUTFIT_STYLES,
  ROOF_SWATCHES,
  TOP_SWATCHES,
  TRIM_SWATCHES,
  type Livery,
  type Outfit,
  type OutfitStyle,
  type Swatch,
} from "../config/livery";
import FlapText from "./FlapText";
import { DriverIcon, LocomotiveIcon } from "./LiveryIcons";

// One per view: picking a tab also moves the camera (see TrainScene).
const TABS: { id: WorkshopView; label: string }[] = [
  { id: "train", label: "Locomotive" },
  { id: "driver", label: "Conducteur" },
];

// What `top` and `bottom` dress, for each outfit (see config/livery).
const PART_LABELS: Record<OutfitStyle, { top: string; bottom: string }> = {
  uniform: { top: "Veste", bottom: "Pantalon et képi" },
  overalls: { top: "Chemise", bottom: "Salopette et casquette" },
  hoodie: { top: "Sweat", bottom: "Pantalon" },
};

const sameLivery = (a: Livery, b: Livery) =>
  a.body === b.body && a.roof === b.roof && a.trim === b.trim;

const sameOutfit = (a: Outfit, b: Outfit) =>
  a.style === b.style && a.top === b.top && a.bottom === b.bottom;

// The workshop ("custom" mode): repaint the locomotive and dress the
// driver, the scene following each pick live (see config/livery). Dressed
// as a work order: the departures board's split-flap strip on top, card
// stock below a perforation, like the project dialog (.theme-ticket). A
// side card on larger screens, the train framed beside it (see
// TrainScene), a bottom sheet on phones, with its own way back since the
// return ticket is left out there (see Overlay).
export default function Workshop({ onLeave }: { onLeave: () => void }) {
  const { workshopView: tab, setWorkshopView: setTab } = useTrainContext();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="theme-ticket pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[50dvh] flex-col text-foreground drop-shadow-2xl transition delay-500 duration-500 starting:translate-y-6 starting:opacity-0 sm:inset-x-auto sm:top-20 sm:right-5 sm:bottom-auto sm:max-h-[calc(100dvh-7rem)] sm:w-96"
    >
      {/* Split-flap header, as on the board, with the tabs. */}
      <header className="notch-bottom shrink-0 rounded-t-xl bg-board-flap px-5 pt-4 pb-3 text-board-ink">
        <p className="font-mono text-[0.625rem] tracking-[0.2em] uppercase opacity-80">
          Dépôt · Bon d&apos;atelier
        </p>
        <h2
          id={`${id}-title`}
          ref={headingRef}
          tabIndex={-1}
          className="relative mt-1 font-mono text-2xl font-semibold tracking-wide uppercase outline-none"
        >
          <FlapText text="L'atelier" />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-px bg-board"
          />
        </h2>
        <div
          role="tablist"
          aria-label="À personnaliser"
          className="mt-3 flex gap-1 rounded-xl bg-board p-1"
          onKeyDown={(e) => {
            // Arrow keys move between tabs, as in any tab list.
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const index = TABS.findIndex((t) => t.id === tab);
            const step = e.key === "ArrowRight" ? 1 : -1;
            const next = (index + step + TABS.length) % TABS.length;
            setTab(TABS[next].id);
            tabRefs.current[next]?.focus();
          }}
        >
          {TABS.map((option, i) => {
            const active = option.id === tab;
            return (
              <button
                key={option.id}
                ref={(button) => {
                  tabRefs.current[i] = button;
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${option.id}`}
                aria-selected={active}
                aria-controls={`${id}-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(option.id)}
                className={`min-h-9 flex-1 rounded-lg px-3 font-mono text-[0.6875rem] tracking-wider uppercase transition outline-offset-2 outline-board-ink focus-visible:outline-2 ${active ? "bg-board-ink text-board" : "text-board-ink/70 hover:bg-board-flap hover:text-board-ink"}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Card stock, past the perforation. Only it scrolls. */}
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${tab}`}
        className="notch-top min-h-0 overflow-y-auto border-t-2 border-dashed border-ticket-ink/30 bg-background px-5 pt-4 pb-6 sm:rounded-b-xl"
      >
        {tab === "train" ? <TrainTab /> : <DriverTab />}

        <button
          type="button"
          onClick={onLeave}
          className="mt-6 min-h-11 w-full rounded-full bg-accent px-4 font-mono text-xs tracking-wider text-on-accent uppercase transition hover:brightness-110 sm:hidden"
        >
          Retour au voyage
        </button>
      </div>
    </section>
  );
}

function TrainTab() {
  const { livery, setLivery } = useLivery();
  const pick = (part: keyof Livery) => (color: string) =>
    setLivery({ ...livery, [part]: color });

  return (
    <>
      <Section
        title="Livrées"
        action={
          <ResetButton
            disabled={sameLivery(livery, DEFAULT_LIVERY)}
            onClick={() => setLivery(DEFAULT_LIVERY)}
          >
            D&apos;origine
          </ResetButton>
        }
      >
        <div
          role="radiogroup"
          aria-label="Livrées"
          className="grid grid-cols-3 gap-2"
        >
          {LIVERIES.map(({ name, ...colors }) => (
            <OptionCard
              key={name}
              name="livery"
              label={name}
              checked={sameLivery(livery, colors)}
              onChange={() => setLivery(colors)}
            >
              <LocomotiveIcon livery={colors} />
            </OptionCard>
          ))}
        </div>
      </Section>

      <Section title="Sur mesure">
        <SwatchPicker
          legend="Caisse"
          name="body"
          swatches={BODY_SWATCHES}
          value={livery.body}
          onChange={pick("body")}
        />
        <SwatchPicker
          legend="Toit"
          name="roof"
          swatches={ROOF_SWATCHES}
          value={livery.roof}
          onChange={pick("roof")}
        />
        <SwatchPicker
          legend="Garnitures"
          name="trim"
          swatches={TRIM_SWATCHES}
          value={livery.trim}
          onChange={pick("trim")}
        />
      </Section>
    </>
  );
}

function DriverTab() {
  const { outfit, setOutfit } = useLivery();
  const labels = PART_LABELS[outfit.style];

  return (
    <>
      <Section
        title="Tenue"
        action={
          <ResetButton
            disabled={sameOutfit(outfit, DEFAULT_OUTFIT)}
            onClick={() => setOutfit(DEFAULT_OUTFIT)}
          >
            D&apos;origine
          </ResetButton>
        }
      >
        <div
          role="radiogroup"
          aria-label="Tenue"
          className="grid grid-cols-3 gap-2"
        >
          {OUTFIT_STYLES.map((style) => {
            const checked = outfit.style === style;
            return (
              <OptionCard
                key={style}
                name="outfit"
                label={OUTFIT_LABELS[style]}
                checked={checked}
                // Each style comes in its own colours, recoloured below.
                onChange={() => setOutfit(OUTFITS[style])}
              >
                <DriverIcon outfit={checked ? outfit : OUTFITS[style]} />
              </OptionCard>
            );
          })}
        </div>
      </Section>

      <Section title="Couleurs">
        <SwatchPicker
          legend={labels.top}
          name="top"
          swatches={TOP_SWATCHES}
          value={outfit.top}
          onChange={(top) => setOutfit({ ...outfit, top })}
        />
        <SwatchPicker
          legend={labels.bottom}
          name="bottom"
          swatches={BOTTOM_SWATCHES}
          value={outfit.bottom}
          onChange={(bottom) => setOutfit({ ...outfit, bottom })}
        />
      </Section>
    </>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-4 first:mt-0">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h3 className="font-mono text-xs tracking-wider text-accent uppercase">
          {title}
        </h3>
        {action}
      </div>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function ResetButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="-mr-2 flex min-h-8 items-center gap-1 rounded-full px-2 font-mono text-[0.625rem] tracking-wider text-muted uppercase transition hover:text-accent disabled:invisible"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
      </svg>
      {children}
    </button>
  );
}

// A radio dressed as a small card: a picture, its name below, stamped
// when picked.
function OptionCard({
  name,
  label,
  checked,
  onChange,
  children,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="group relative cursor-pointer">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="flex flex-col items-center gap-1 rounded-lg border-2 border-line bg-ticket-ink/[0.03] px-1 pt-2 pb-1.5 transition group-hover:border-ticket-ink/40 peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground">
        {children}
        <span className="max-w-full truncate font-mono text-[0.625rem] tracking-wide uppercase">
          {label}
        </span>
      </span>
      {/* Punched, like a ticket once used. */}
      <span
        aria-hidden="true"
        className="absolute -top-1.5 -right-1.5 grid size-5 scale-50 place-items-center rounded-full bg-accent text-on-accent opacity-0 shadow transition peer-checked:scale-100 peer-checked:opacity-100"
      >
        <CheckIcon />
      </span>
    </label>
  );
}

function SwatchPicker({
  legend,
  name,
  swatches,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  swatches: Swatch[];
  value: string;
  onChange: (color: string) => void;
}) {
  const current = swatches.find((swatch) => swatch.color === value);
  return (
    <fieldset className="mt-2">
      <legend className="float-left w-full font-mono text-[0.6875rem] tracking-wider text-muted uppercase">
        {legend}
        {current && (
          <span className="float-right tracking-normal text-foreground normal-case">
            {current.name}
          </span>
        )}
      </legend>
      <div className="clear-both -mx-1.5 flex flex-wrap">
        {swatches.map((swatch) => (
          <label
            key={swatch.color}
            title={swatch.name}
            className="group relative grid size-11 cursor-pointer place-items-center"
          >
            <input
              type="radio"
              name={name}
              value={swatch.color}
              checked={swatch.color === value}
              onChange={() => onChange(swatch.color)}
              className="peer sr-only"
            />
            {/* An enamel dot, a little shadow at its foot. */}
            <span
              aria-hidden="true"
              style={{ backgroundColor: swatch.color }}
              className="size-8 rounded-full border-2 border-ticket-ink/15 shadow-[inset_0_-4px_0_rgb(0_0_0/0.18),inset_0_2px_0_rgb(255_255_255/0.25)] transition group-hover:scale-110 peer-checked:scale-110 peer-checked:border-ticket-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground"
            />
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute opacity-0 transition peer-checked:opacity-100 ${isLight(swatch.color) ? "text-ticket-ink" : "text-white"}`}
            >
              <CheckIcon />
            </span>
            <span className="sr-only">{swatch.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Whether ink reads better than white on a "#rrggbb" colour.
function isLight(color: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}
