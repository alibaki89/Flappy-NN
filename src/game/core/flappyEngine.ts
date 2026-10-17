import { GAME_CONFIG, type GameAction } from "./config";
import { createTerrain, type PipePlan } from "./terrain";

export type GameState = {
  birdY: number;
  birdVelocity: number;
  scrollX: number;
  score: number;
  done: boolean;
  frame: number;
  previousAction: GameAction;
};

export type GameRuntime = {
  seed: string;
  terrain: PipePlan[];
  state: GameState;
};

export type VisiblePipe = {
  id: number;
  x: number;
  gapY: number;
  gapSize: number;
  gapTop: number;
  gapBottom: number;
};

export function createGame(seed: string): GameRuntime {
  return {
    seed,
    terrain: createTerrain(seed),
    state: {
      birdY: GAME_CONFIG.height / 2,
      birdVelocity: 0,
      scrollX: 0,
      score: 0,
      done: false,
      frame: 0,
      previousAction: 0,
    },
  };
}

export function getVisiblePipes(game: GameRuntime): VisiblePipe[] {
  const { terrain, state } = game;

  return terrain
    .map((pipe) => {
      const x = pipe.startX - state.scrollX;

      return {
        id: pipe.id,
        x,
        gapY: pipe.gapY,
        gapSize: pipe.gapSize,
        gapTop: pipe.gapY - pipe.gapSize / 2,
        gapBottom: pipe.gapY + pipe.gapSize / 2,
      };
    })
    .filter(
      (pipe) =>
        pipe.x + GAME_CONFIG.pipeWidth > -40 &&
        pipe.x < GAME_CONFIG.width + 40,
    );
}

export function getNextPipe(game: GameRuntime): VisiblePipe {
  const next = game.terrain.find(
    (pipe) =>
      pipe.startX + GAME_CONFIG.pipeWidth >=
      game.state.scrollX + GAME_CONFIG.birdX,
  );

  const pipe = next ?? game.terrain[game.terrain.length - 1];

  return {
    id: pipe.id,
    x: pipe.startX - game.state.scrollX,
    gapY: pipe.gapY,
    gapSize: pipe.gapSize,
    gapTop: pipe.gapY - pipe.gapSize / 2,
    gapBottom: pipe.gapY + pipe.gapSize / 2,
  };
}

function updateScore(game: GameRuntime) {
  const passed = game.terrain.filter(
    (pipe) =>
      pipe.startX + GAME_CONFIG.pipeWidth <
      game.state.scrollX + GAME_CONFIG.birdX,
  ).length;

  game.state.score = passed;
}

function ellipseOverlapsRect(
  ellipseCenterX: number,
  ellipseCenterY: number,
  radiusX: number,
  radiusY: number,
  rectLeft: number,
  rectTop: number,
  rectRight: number,
  rectBottom: number,
): boolean {
  const closestX = Math.max(rectLeft, Math.min(ellipseCenterX, rectRight));
  const closestY = Math.max(rectTop, Math.min(ellipseCenterY, rectBottom));

  const normalizedX = (closestX - ellipseCenterX) / radiusX;
  const normalizedY = (closestY - ellipseCenterY) / radiusY;

  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

function checkCollision(game: GameRuntime): boolean {
  const state = game.state;

  const radiusX = GAME_CONFIG.birdHitboxRadiusX;
  const radiusY = GAME_CONFIG.birdHitboxRadiusY;

  const birdTop = state.birdY - radiusY;
  const birdBottom = state.birdY + radiusY;

  if (birdTop <= 0) {
    return true;
  }

  if (birdBottom >= GAME_CONFIG.height - GAME_CONFIG.groundHeight) {
    return true;
  }

  for (const pipe of getVisiblePipes(game)) {
    const pipeLeft = pipe.x + GAME_CONFIG.collisionGrace;
    const pipeRight =
      pipe.x + GAME_CONFIG.pipeWidth - GAME_CONFIG.collisionGrace;

    const hitsTopPipe = ellipseOverlapsRect(
      GAME_CONFIG.birdX,
      state.birdY,
      radiusX,
      radiusY,
      pipeLeft,
      0,
      pipeRight,
      pipe.gapTop - GAME_CONFIG.collisionGrace,
    );

    const hitsBottomPipe = ellipseOverlapsRect(
      GAME_CONFIG.birdX,
      state.birdY,
      radiusX,
      radiusY,
      pipeLeft,
      pipe.gapBottom + GAME_CONFIG.collisionGrace,
      pipeRight,
      GAME_CONFIG.height - GAME_CONFIG.groundHeight,
    );

    if (hitsTopPipe || hitsBottomPipe) {
      return true;
    }
  }

  return false;
}

export function stepGame(game: GameRuntime, action: GameAction) {
  const state = game.state;

  if (state.done) {
    return;
  }

  state.frame += 1;
  state.previousAction = action;

  if (action === 1) {
    state.birdVelocity = GAME_CONFIG.flapStrength;
  }

  state.birdVelocity += GAME_CONFIG.gravity;
  state.birdY += state.birdVelocity;

  state.scrollX += GAME_CONFIG.pipeSpeed;

  updateScore(game);

  if (checkCollision(game)) {
    state.done = true;
  }
}

export function getAiState(game: GameRuntime): number[] {
  const state = game.state;
  const nextPipe = getNextPipe(game);

  const pipeDistance = nextPipe.x - GAME_CONFIG.birdX;
  const yDifference = state.birdY - nextPipe.gapY;
  const timeToPipe = pipeDistance / GAME_CONFIG.pipeSpeed;

  return [
    state.birdY / GAME_CONFIG.height,
    state.birdVelocity / 10,
    pipeDistance / GAME_CONFIG.width,
    nextPipe.gapY / GAME_CONFIG.height,
    yDifference / GAME_CONFIG.height,
    GAME_CONFIG.pipeSpeed / 6,
    nextPipe.gapSize / GAME_CONFIG.height,
    timeToPipe / 120,
    state.previousAction,
  ];
}

export function createRandomSeed() {
  return Math.random().toString(36).slice(2, 10);
}
