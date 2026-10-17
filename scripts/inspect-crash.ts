import fs from "node:fs";
import path from "node:path";

import {
  createGame,
  getAiState,
  getNextPipe,
  stepGame,
} from "../src/game/core/flappyEngine";
import { DqnAgent, type SerializedDqnModel } from "../src/game/ai/dqnAgent";

const MODEL_PATH = path.join(process.cwd(), "public/models/cpu-model.json");
const SEED = process.argv[2] ?? "greedy-eval-1";
const MAX_FRAMES = Number(process.argv[3] ?? 200000);

const data = JSON.parse(
  fs.readFileSync(MODEL_PATH, "utf8"),
) as SerializedDqnModel;

const agent = new DqnAgent();
agent.loadModelData(data);

const game = createGame(SEED);

let frames = 0;

console.log("");
console.log("=== CRASH INSPECTOR ===");
console.log(`Seed: ${SEED}`);
console.log("");

while (!game.state.done && frames < MAX_FRAMES) {
  const state = getAiState(game);
  const pipe = getNextPipe(game);
  const decision = agent.chooseAction(state, false);

  const distance = pipe.x - 112;

  if (game.state.score >= 270 || game.state.done) {
    console.log(
      `Frame ${String(frames).padStart(6)} | ` +
        `Score ${String(game.state.score).padStart(4)} | ` +
        `BirdY ${game.state.birdY.toFixed(2).padStart(8)} | ` +
        `Vel ${game.state.birdVelocity.toFixed(2).padStart(7)} | ` +
        `PipeX ${pipe.x.toFixed(2).padStart(8)} | ` +
        `Dist ${distance.toFixed(2).padStart(8)} | ` +
        `GapY ${pipe.gapY.toFixed(2).padStart(8)} | ` +
        `GapSize ${pipe.gapSize.toFixed(2).padStart(7)} | ` +
        `Action ${decision.action === 1 ? "flap" : "wait"} | ` +
        `Qwait ${decision.qWait.toFixed(3)} | ` +
        `Qflap ${decision.qFlap.toFixed(3)}`,
    );
  }

  stepGame(game, decision.action);
  frames += 1;
}

console.log("");
console.log("Finished:");
console.log(`  Score:  ${game.state.score}`);
console.log(`  Frames: ${frames}`);
console.log(`  Done:   ${game.state.done}`);
console.log("");
