// Seasons the scene can be switched to (see ui/SeasonSwitch): only a look,
// colours, light, sky and snow. Switching blends every value below from
// one season to the next (see hooks/useSeason).
export const SEASONS = ["summer", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_LABELS: Record<Season, string> = {
  summer: "Été",
  winter: "Hiver",
};

// Snow on whatever faces up (see shaders/snow), and falling flakes.
export const SNOW_COLOR = "#eef2f6";

type SeasonLook = {
  colors: {
    // Fog and scene background.
    haze: string;
    ambient: string;
    sun: string;
    ground: string;
    // Over the whole forest (see Forest): white leaves its own colours.
    forest: string;
    // Ponds: water, then ice.
    water: string;
    clouds: string;
  };
  values: {
    ambientIntensity: number;
    // Multiply the "Scene" settings' lightIntensity and fogDensity.
    sunScale: number;
    fogScale: number;
    // Snow is bright: raised so the bloom doesn't flood it.
    bloomThreshold: number;
    // drei <Sky> uniforms.
    turbidity: number;
    rayleigh: number;
    mieCoefficient: number;
    // 0 → 1: snow on whatever faces up, then falling flakes.
    snow: number;
    snowfall: number;
  };
};

export type SeasonColor = keyof SeasonLook["colors"];
export type SeasonValue = keyof SeasonLook["values"];

export const SEASON_LOOKS: Record<Season, SeasonLook> = {
  summer: {
    colors: {
      haze: "#3a2a1f",
      ambient: "#4a5a7a",
      sun: "#ffb56b",
      ground: "#243520",
      forest: "#ffffff",
      water: "#3d8fd6",
      clouds: "#ffd2b5",
    },
    values: {
      ambientIntensity: 0.25,
      sunScale: 1,
      fogScale: 1,
      bloomThreshold: 0.3,
      turbidity: 10,
      rayleigh: 1.2,
      mieCoefficient: 0.05,
      snow: 0,
      snowfall: 0,
    },
  },
  // Cold dusk: blue-grey haze, a paler sun, snow everywhere.
  winter: {
    colors: {
      haze: "#5b6072",
      ambient: "#8a9ac0",
      sun: "#ffc9a0",
      ground: "#dfe5ec",
      forest: "#d5dde6",
      water: "#a9cbe0",
      clouds: "#dfe4ee",
    },
    values: {
      ambientIntensity: 0.45,
      sunScale: 0.75,
      fogScale: 1.3,
      bloomThreshold: 0.8,
      turbidity: 4,
      rayleigh: 2.5,
      mieCoefficient: 0.02,
      snow: 1,
      snowfall: 1,
    },
  },
};
