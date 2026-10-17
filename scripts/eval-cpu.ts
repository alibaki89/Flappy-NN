import fs from "node:fs";
import path from "node:path";

import {
  createGame,
  getAiState,
  stepGame,
} from "../src/game/core/flappyEngine";
import { DqnAgent, type SerializedDqnModel } from "../src/game/ai/dqnAgent";

const MODEL_PATH = path.join(process.cwd(), "public/models/cpu-model.json");

const EPISODES = Number(process.argv[2] ?? 30);
const WIN_SCORE = Number(process.argv[3] ?? 30);

// Dynamic frame cap.
// Score 100 took about 14107 frames, so 160 frames per score is safe.
const MAX_FRAMES = Number(process.argv[4] ?? WIN_SCORE * 160 + 3000);

type EndReason = "win" | "crash" | "frame_cap";

type EvalResult = {
  score: number;
  frames: number;
  reason: EndReason;
};

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

function evaluateEpisode(agent: DqnAgent, episode: number): EvalResult {
  const game = createGame(`greedy-eval-${episode}`);

  let frames = 0;

  while (
    !game.state.done &&
    frames < MAX_FRAMES &&
    game.state.score < WIN_SCORE
  ) {
    const state = getAiState(game);

    // No epsilon. No random action. Greedy neural-network policy only.
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
    score: game.state.score,
    frames,
    reason,
  };
}

function main() {
  const agent = loadModel();

  const results: EvalResult[] = [];

  console.log("");
  console.log("=== GREEDY MODEL EVALUATION ===");
  console.log("No epsilon. No exploration. No training.");
  console.log(`Model:      ${MODEL_PATH}`);
  console.log(`Episodes:   ${EPISODES}`);
  console.log(`Win score:  ${WIN_SCORE}`);
  console.log(`Max frames: ${MAX_FRAMES}`);
  console.log("");

  for (let episode = 1; episode <= EPISODES; episode += 1) {
    const result = evaluateEpisode(agent, episode);
    results.push(result);

    console.log(
      `Eval ${String(episode).padStart(3)} | ` +
        `Score: ${String(result.score).padStart(4)} | ` +
        `Frames: ${String(result.frames).padStart(6)} | ` +
        `End: ${result.reason}`,
    );
  }

  const scores = results.map((result) => result.score);
  const frames = results.map((result) => result.frames);

  const avgScore =
    scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length);

  const avgFrames =
    frames.reduce((sum, frameCount) => sum + frameCount, 0) /
    Math.max(1, frames.length);

  const wins = results.filter((result) => result.reason === "win").length;
  const crashes = results.filter((result) => result.reason === "crash").length;
  const caps = results.filter((result) => result.reason === "frame_cap").length;

  console.log("");
  console.log("=== SUMMARY ===");
  console.log(`Wins:       ${wins}/${EPISODES}`);
  console.log(`Crashes:    ${crashes}/${EPISODES}`);
  console.log(`Frame caps: ${caps}/${EPISODES}`);
  console.log(`Avg score:  ${avgScore.toFixed(2)}`);
  console.log(`Min score:  ${Math.min(...scores)}`);
  console.log(`Max score:  ${Math.max(...scores)}`);
  console.log(`Avg frame:  ${avgFrames.toFixed(1)}`);
  console.log(`Scores:     [${scores.join(", ")}]`);
  console.log("");
}

main();
