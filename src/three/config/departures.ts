// Projects are listed as departures, in content order: FIRST_DEPARTURE,
// then every DEPARTURE_INTERVAL minutes. Shared by the 3D board and its
// HTML twin.
const FIRST_DEPARTURE = 8 * 60;
const DEPARTURE_INTERVAL = 20;

// Stagger between rows as the board flips in.
export const ROW_FLAP_DELAY_MS = 90;

export function departureTime(index: number) {
  const minutes = FIRST_DEPARTURE + index * DEPARTURE_INTERVAL;
  const hh = String(Math.floor(minutes / 60) % 24).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
