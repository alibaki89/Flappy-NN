import { GAME_CONFIG } from "./config";

export type PipePlan = {
  id: number;
  startX: number;
  gapY: number;
  gapSize: number;
};

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

export function createTerrain(seed: string, pipeCount = 5000): PipePlan[] {
  const random = mulberry32(hashSeed(seed));

  return Array.from({ length: pipeCount }, (_, index) => {
    const gapSize = randomBetween(
      random,
      GAME_CONFIG.pipeGapMin,
      GAME_CONFIG.pipeGapMax,
    );

    const safeTop = 100 + gapSize / 2;
    const safeBottom =
      GAME_CONFIG.height -
      GAME_CONFIG.groundHeight -
      95 -
      gapSize / 2;

    const gapY = randomBetween(random, safeTop, safeBottom);

    return {
      id: index,
      startX: GAME_CONFIG.firstPipeX + index * GAME_CONFIG.pipeSpacing,
      gapY,
      gapSize,
    };
  });
}
