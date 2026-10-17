import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  createGame,
  getAiState,
  stepGame,
} from "../src/game/core/flappyEngine";
import { GAME_CONFIG } from "../src/game/core/config";
import { DqnAgent, type SerializedDqnModel } from "../src/game/ai/dqnAgent";

const MODEL_PATH = path.join(process.cwd(), "public/models/cpu-model.json");

const EPISODES = Number(process.argv[2] ?? 30);
const WIN_SCORE = Number(process.argv[3] ?? 1000);
const MAX_FRAMES = Number(process.argv[4] ?? WIN_SCORE * 160 + 3000);

type EndReason = "win" | "crash" | "frame_cap";

type EvalResult = {
  episode: number;
  seed: string;
  score: number;
  frames: number;
  reason: EndReason;
};

function createRandomSeed(episode: number): string {
  return `random-eval-${episode}-${crypto.randomUUID()}`;
}

function loadModel(): DqnAgent {
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(`Model file not found: ${MODEL_PATH}`);
  }

  const data = JSON.parse(
    fs.readFileSync(MODEL_PATH, "utf8"),
  ) as SerializedDqnModel;

  const agent = new DqnAgent();
  agent.loadModelData(data);

  return agent;
}

function evaluateEpisode(
  agent: DqnAgent,
  episode: number,
  seed: string,
): EvalResult {
  const game = createGame(seed);

  let frames = 0;

  while (
    !game.state.done &&
    frames < MAX_FRAMES &&
    game.state.score < WIN_SCORE
  ) {
    const state = getAiState(game);

    // Greedy NN policy only:
    // no epsilon, no random action, no heuristic, no training.
    const decision = agent.chooseAction(state, false);

    stepGame(game, decision.action);
    frames += 1;
  }

  let reason: EndReason = "frame_cap";

  if (game.state.score >= WIN_SCORE) {
    reason = "win";
  } else if (game.state.done) {
    reason = "crash";
  }

  return {
    episode,
    seed,
    score: game.state.score,
    frames,
    reason,
  };
}

function saveReport(results: EvalResult[]) {
  const dir = path.join(process.cwd(), "public/models/eval-reports");
  fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replaceAll(".", "-");

  const filePath = path.join(
    dir,
    `random-eval-score${WIN_SCORE}-${timestamp}.json`,
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        model: MODEL_PATH,
        episodes: EPISODES,
        winScore: WIN_SCORE,
        maxFrames: MAX_FRAMES,
        config: {
          pipeGapMin: GAME_CONFIG.pipeGapMin,
          pipeGapMax: GAME_CONFIG.pipeGapMax,
          pipeSpeed: GAME_CONFIG.pipeSpeed,
          gravity: GAME_CONFIG.gravity,
          flapStrength: GAME_CONFIG.flapStrength,
        },
        results,
      },
      null,
      2,
    ),
    "utf8",
  );

  return filePath;
}

function main() {
  const agent = loadModel();
  const results: EvalResult[] = [];

  console.log("");
  console.log("=== RANDOM TERRAIN GREEDY EVALUATION ===");
  console.log("No epsilon. No exploration. No training.");
  console.log(`Model:       ${MODEL_PATH}`);
  console.log(`Episodes:    ${EPISODES}`);
  console.log(`Win score:   ${WIN_SCORE}`);
  console.log(`Max frames:  ${MAX_FRAMES}`);
  console.log(`Gap range:   ${GAME_CONFIG.pipeGapMin}–${GAME_CONFIG.pipeGapMax}`);
  console.log(`Pipe speed:  ${GAME_CONFIG.pipeSpeed}`);
  console.log("");

  for (let episode = 1; episode <= EPISODES; episode += 1) {
    const seed = createRandomSeed(episode);
    const result = evaluateEpisode(agent, episode, seed);

    results.push(result);

    console.log(
      `Eval ${String(episode).padStart(3)} | ` +
        `Score: ${String(result.score).padStart(4)} | ` +
        `Frames: ${String(result.frames).padStart(6)} | ` +
        `End: ${result.reason.padEnd(9)} | ` +
        `Seed: ${result.seed}`,
    );
  }

  const scores = results.map((result) => result.score);
  const frames = results.map((result) => result.frames);

  const wins = results.filter((result) => result.reason === "win").length;
  const crashes = results.filter((result) => result.reason === "crash").length;
  const frameCaps = results.filter(
    (result) => result.reason === "frame_cap",
  ).length;

  const avgScore =
    scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length);

  const avgFrames =
    frames.reduce((sum, frameCount) => sum + frameCount, 0) /
    Math.max(1, frames.length);

  const reportPath = saveReport(results);

  console.log("");
  console.log("=== SUMMARY ===");
  console.log(`Wins:       ${wins}/${EPISODES}`);
  console.log(`Crashes:    ${crashes}/${EPISODES}`);
  console.log(`Frame caps: ${frameCaps}/${EPISODES}`);
  console.log(`Avg score:  ${avgScore.toFixed(2)}`);
  console.log(`Min score:  ${Math.min(...scores)}`);
  console.log(`Max score:  ${Math.max(...scores)}`);
  console.log(`Avg frame:  ${avgFrames.toFixed(1)}`);
  console.log(`Scores:     [${scores.join(", ")}]`);
  console.log(`Report:     ${reportPath}`);
  console.log("");

  const failures = results.filter((result) => result.reason !== "win");

  if (failures.length > 0) {
    console.log("Failed seeds:");
    for (const failure of failures) {
      console.log(
        `  Score ${failure.score} | ${failure.reason} | ${failure.seed}`,
      );
    }
    console.log("");
    console.log("To inspect a failed seed:");
    console.log(`  npx tsx scripts/inspect-crash.ts "${failures[0].seed}"`);
    console.log("");
  }
}

main();
