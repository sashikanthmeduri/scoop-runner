import type { SeasonId } from "./constants";

export type SpriteBank = {
  run: HTMLImageElement[];
  jump: HTMLImageElement[];
  slide: HTMLImageElement[];
  scoop: HTMLImageElement | null;
  breaking: HTMLImageElement | null;
  pass: HTMLImageElement | null;
  camera: HTMLImageElement | null;
  van: HTMLImageElement | null;
  protestor: HTMLImageElement | null;
  paparazzi: HTMLImageElement | null;
  scaffolding: HTMLImageElement | null;
  fakeNews: HTMLImageElement | null;
  sky: Record<SeasonId, HTMLImageElement | null>;
  city: Record<SeasonId, HTMLImageElement | null>;
};

const SEASONS: SeasonId[] = ["sunny", "rainy", "autumn", "spring"];

export function emptyAssets(): SpriteBank {
  return {
    run: [],
    jump: [],
    slide: [],
    scoop: null,
    breaking: null,
    pass: null,
    camera: null,
    van: null,
    protestor: null,
    paparazzi: null,
    scaffolding: null,
    fakeNews: null,
    sky: { sunny: null, rainy: null, autumn: null, spring: null },
    city: { sunny: null, rainy: null, autumn: null, spring: null },
  };
}

function load(src: string, ms = 6000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => reject(new Error(`timeout ${src}`)), ms);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(`fail ${src}`));
    };
    img.src = src;
  });
}

async function optional(src: string): Promise<HTMLImageElement | null> {
  try {
    return await load(src);
  } catch {
    return null;
  }
}

async function many(srcs: string[]): Promise<HTMLImageElement[]> {
  const loaded = await Promise.all(srcs.map(optional));
  return loaded.filter((img): img is HTMLImageElement => img !== null);
}

export async function loadAssets(): Promise<SpriteBank> {
  const bank = emptyAssets();
  const [run, jump, slide, scoop, breaking, pass, camera, van, protestor, paparazzi, scaffolding, fakeNews, ...seasonImgs] =
    await Promise.all([
      many([1, 2, 3, 4, 5, 6].map((i) => `/sprites/run-${i}.png`)),
      many([1, 2, 3, 4].map((i) => `/sprites/jump-${i}.png`)),
      many([1, 2, 3, 4].map((i) => `/sprites/slide-${i}.png`)),
      optional("/sprites/scoop.png"),
      optional("/sprites/breaking.png"),
      optional("/sprites/press-pass.png"),
      optional("/sprites/camera.png"),
      optional("/sprites/van.png"),
      optional("/sprites/protestor.png"),
      optional("/sprites/paparazzi.png"),
      optional("/sprites/scaffolding.png"),
      optional("/sprites/fake-news.png"),
      ...SEASONS.flatMap((id) => [optional(`/bg/${id}-sky.jpg`), optional(`/bg/${id}-city.jpg`)]),
    ]);

  bank.run = run;
  bank.jump = jump;
  bank.slide = slide;
  bank.scoop = scoop;
  bank.breaking = breaking;
  bank.pass = pass;
  bank.camera = camera;
  bank.van = van;
  bank.protestor = protestor;
  bank.paparazzi = paparazzi;
  bank.scaffolding = scaffolding;
  bank.fakeNews = fakeNews;
  SEASONS.forEach((id, i) => {
    bank.sky[id] = seasonImgs[i * 2] ?? null;
    bank.city[id] = seasonImgs[i * 2 + 1] ?? null;
  });
  return bank;
}
