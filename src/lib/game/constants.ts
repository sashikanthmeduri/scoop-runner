export const VIEW_H = 720;
export const GROUND_RATIO = 0.78;
export const PLAYER_X_RATIO = 0.2;

export const GRAVITY = 2650;
export const JUMP_V = -980;
export const DOUBLE_JUMP_V = -840;
export const MAX_FALL = 1400;
export const SLIDE_TIME = 0.46;
export const COYOTE = 0.09;
export const JUMP_BUFFER = 0.13;

export const BASE_SPEED = 330;
export const MAX_SPEED = 760;
export const SPEED_PER_500 = 52;
export const PX_PER_METER = 38;

export const SEASON_METERS = 520;
export const SEASON_BLEND = 3.2;

export const DEADLINE_SCOOP = 9;
export const DEADLINE_BREAKING = 28;
export const FRONTPAGE_TIME = 7.5;

export const INVINCIBLE_TIME = 5.2;
export const FLASH_RANGE = 460;
export const SLOW_TIME = 1.8;
export const SLOW_FACTOR = 0.55;
export const MULT_TIME = 6.5;

export const STEP = 1 / 60;

export type SeasonId = "sunny" | "rainy" | "autumn" | "spring";

export const SEASON_ORDER: SeasonId[] = ["sunny", "rainy", "autumn", "spring"];

export const SEASON_LABEL: Record<SeasonId, string> = {
  sunny: "Sunny Edition",
  rainy: "Rain Desk",
  autumn: "Autumn Extra",
  spring: "Spring City",
};

export type SeasonPalette = {
  far: string[];
  mid: string[];
  window: string;
  street: string;
  sidewalk: string;
  curb: string;
  lamp: string;
  fog: string;
  overlay: string;
  sun: string | null;
};

export const PALETTES: Record<SeasonId, SeasonPalette> = {
  sunny: {
    far: ["#c47a4a", "#d9b48a", "#8c4a2a", "#4a6ea8"],
    mid: ["#f0d2a6", "#e07a4a", "#5b7fb0", "#c9b896", "#7a4e32"],
    window: "#fff1a3",
    street: "#4d463c",
    sidewalk: "#d2c4aa",
    curb: "#9a8c74",
    lamp: "#f4e2a8",
    fog: "rgba(255,220,150,0.05)",
    overlay: "rgba(255,210,110,0.04)",
    sun: "#ffe08a",
  },
  rainy: {
    far: ["#3d4a5c", "#2f3a48", "#4a5c6e", "#2a3340"],
    mid: ["#5a6a7a", "#3e4c5a", "#6b7c8e", "#2f3b48", "#4a5866"],
    window: "#9fd7e8",
    street: "#1e2630",
    sidewalk: "#3a4552",
    curb: "#2a3340",
    lamp: "#d7e7f4",
    fog: "rgba(40,60,80,0.22)",
    overlay: "rgba(30,50,70,0.16)",
    sun: null,
  },
  autumn: {
    far: ["#8a3e1c", "#c45c26", "#6b3a1c", "#a86b32"],
    mid: ["#d4893c", "#8c3a1c", "#c9a06a", "#6e4228", "#e0a05a"],
    window: "#ffd08a",
    street: "#3a2a1c",
    sidewalk: "#c4a078",
    curb: "#8a6844",
    lamp: "#ffc878",
    fog: "rgba(200,90,30,0.10)",
    overlay: "rgba(180,70,20,0.10)",
    sun: "#ffb45a",
  },
  spring: {
    far: ["#7aa88a", "#c9a0b0", "#8eb89a", "#d8c4a8"],
    mid: ["#f2e4c8", "#b8d4c0", "#e8b8c4", "#9cbc8c", "#dcc8a8"],
    window: "#fff8e8",
    street: "#5a584c",
    sidewalk: "#e8ddc8",
    curb: "#b8ae96",
    lamp: "#fff0d0",
    fog: "rgba(180,220,180,0.10)",
    overlay: "rgba(160,210,170,0.08)",
    sun: "#fff4c8",
  },
};
