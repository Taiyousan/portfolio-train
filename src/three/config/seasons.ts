// Seasons the scene can be switched to (see ui/SeasonSwitch), and rain:
// only a look, colours, light, sky, leaves, snow and rain. Switching
// blends every value below from one to the next (see hooks/useSeason). The
// scene opens in summer (see TrainContext).
export const SEASONS = ["summer", "autumn", "winter", "rain"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_LABELS: Record<Season, string> = {
  summer: "Été",
  autumn: "Automne",
  winter: "Hiver",
  rain: "Pluie",
};

// Snow on whatever faces up (see shaders/snow), and falling flakes.
export const SNOW_COLOR = "#eef2f6";

// Falling rain's streaks.
export const RAIN_COLOR = "#b8c4d2";

// Autumn leaves: what the forest's leafy crowns, bushes and grass turn to
// (see shaders/forestMaterial), one per prop, and the falling leaves.
export const AUTUMN_LEAVES = ["#d9822b", "#b8432d", "#e0ad3a", "#9c5a2a"];

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
    // 0 → 1: the forest's leaves turned, then falling leaves.
    autumn: number;
    leaffall: number;
    // 0 → 1: falling rain.
    rainfall: number;
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
      autumn: 0,
      leaffall: 0,
      rainfall: 0,
    },
  },
  // Golden dusk: a warmer, hazier light, the leaves turned and falling.
  autumn: {
    colors: {
      haze: "#4a3222",
      ambient: "#6a5a70",
      sun: "#ffa04f",
      ground: "#36361f",
      forest: "#fff1e0",
      water: "#4b80aa",
      clouds: "#ffc29a",
    },
    values: {
      ambientIntensity: 0.28,
      sunScale: 0.95,
      fogScale: 1.15,
      bloomThreshold: 0.3,
      turbidity: 12,
      rayleigh: 1.5,
      mieCoefficient: 0.06,
      snow: 0,
      snowfall: 0,
      autumn: 1,
      leaffall: 1,
      rainfall: 0,
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
      autumn: 0,
      leaffall: 0,
      rainfall: 0,
    },
  },
  // Overcast and wet: grey haze, a veiled sun, a darker ground, rain.
  rain: {
    colors: {
      haze: "#454a52",
      ambient: "#7c8698",
      sun: "#c8c2b8",
      ground: "#1c2619",
      forest: "#c9d0cf",
      water: "#4f6f86",
      clouds: "#8d939d",
    },
    values: {
      ambientIntensity: 0.5,
      sunScale: 0.45,
      fogScale: 1.6,
      bloomThreshold: 0.5,
      turbidity: 20,
      rayleigh: 0.6,
      mieCoefficient: 0.08,
      snow: 0,
      snowfall: 0,
      autumn: 0,
      leaffall: 0,
      rainfall: 1,
    },
  },
};
