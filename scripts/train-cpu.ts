import fs from "node:fs";
import path from "node:path";

import {
  createGame,
  getAiState,
  stepGame,
} from "../src/game/core/flappyEngine";
import { GAME_CONFIG, type GameAction } from "../src/game/core/config";
import { DqnAgent, type SerializedDqnModel } from "../src/game/ai/dqnAgent";

const EPISODES = Number(process.argv[2] ?? 5000);

const WIN_SCORE = 30;
const MAX_FRAMES = 5000;

const EVAL_EVERY = 100;
const EVAL_EPISODES = 30;

const TRAIN_BATCHES_AFTER_EPISODE = 25;

// Important:
// Random 50/50 flap/wait is awful for Flappy Bird.
// This is still pure RL exploration, not teacher/imitation.
const RANDOM_FLAP_PROBABILITY = 0.045;

const MODEL_PATH = path.join(process.cwd(), "public/models/cpu-model.json");
const CHECKPOINT_DIR = path.join(process.cwd(), "public/models/checkpoints");

type EpisodeResult = {
  score: number;
  frames: number;
  totalReward: number;
  loss: number;
};

type EvalResult = {
  avg: number;
  min: number;
  max: number;
  wins: number;
  scores: number[];
};

function chooseTrainingAction(agent: DqnAgent, state: number[]): GameAction {
  const greedyAction = agent.chooseAction(state, false).action;

  if (Math.random() < agent.epsilon) {
    return Math.random() < RANDOM_FLAP_PROBABILITY ? 1 : 0;
  }

  return greedyAction;
}

function playEpisode({
  agent,
  episode,
  explore,
  learn,
}: {
  agent: DqnAgent;
  episode: number;
  explore: boolean;
  learn: boolean;
}): EpisodeResult {
  const game = createGame(`dqn-${episode}`);

  let frames = 0;
  let totalReward = 0;

  while (
    !game.state.done &&
    frames < MAX_FRAMES &&
    game.state.score < WIN_SCORE
  ) {
    const state = getAiState(game);
    const previousScore = game.state.score;

    const action = explore
      ? chooseTrainingAction(agent, state)
      : agent.chooseAction(state, false).action;

    stepGame(game, action);

    const nextState = getAiState(game);
    const reachedWin = game.state.score >= WIN_SCORE;

    const previousCenterDistance = Math.min(1, Math.abs(state[4]));
    const nextCenterDistance = Math.min(1, Math.abs(nextState[4]));
    const centerImprovement = previousCenterDistance - nextCenterDistance;
    const scoreGain = game.state.score - previousScore;

    let reward = 0;

    // Surviving is useful, but not enough by itself.
    reward += 0.02;

    // Reward moving toward the gap center.
    reward += centerImprovement * 1.2;

    // Reward being reasonably aligned with the gap.
    reward += (1 - nextCenterDistance) * 0.04;

    // Strong reward for passing a pipe.
    reward += scoreGain * 18.0;

    // Small penalty for flapping so the model does not spam flap.
    if (action === 1) {
      reward -= 0.015;
    }

    // Strong punishment for death.
    if (game.state.done) {
      reward -= 10.0;
    }

    // Reaching the target score is very good.
    if (reachedWin) {
      reward += 40.0;
    }

    totalReward += reward;

    if (learn) {
      agent.remember({
        state,
        action,
        reward,
        nextState,
        done: game.state.done || reachedWin,
        source: "cpu",
      });
    }

    frames += 1;
  }

  let loss = 0;

  if (learn) {
    const summary = agent.train(TRAIN_BATCHES_AFTER_EPISODE);
    loss = summary.loss;
  }

  return {
    score: game.state.score,
    frames,
    totalReward,
    loss,
  };
}

function evaluate(agent: DqnAgent, episode: number): EvalResult {
  const scores: number[] = [];

  for (let i = 0; i < EVAL_EPISODES; i += 1) {
    const result = playEpisode({
      agent,
      episode: 1_000_000 + episode * 1000 + i,
      explore: false,
      learn: false,
    });

    scores.push(result.score);
  }

  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  return {
    avg,
    min: Math.min(...scores),
    max: Math.max(...scores),
    wins: scores.filter((score) => score >= WIN_SCORE).length,
    scores,
  };
}

function saveModel(agent: DqnAgent, filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(agent.exportModelData(), null, 2));
}

function main() {
  const agent = new DqnAgent();

  if (fs.existsSync(MODEL_PATH)) {
    const data = JSON.parse(
      fs.readFileSync(MODEL_PATH, "utf8"),
    ) as SerializedDqnModel;

    agent.loadModelData(data);
    console.log("Loaded existing model for continued pure-DQN training.");
  } else {
    console.log("No existing model found. Starting from random weights.");
  }

  agent.epsilon = 0.25;
  agent.epsilonMin = 0.04;
  agent.epsilonDecay = 0.9997;

  agent.learningRate = 0.00008;
  agent.gamma = 0.97;

  let bestWins = -1;
  let bestAvg = -Infinity;
  let bestMin = -Infinity;
  let bestMax = -Infinity;

  console.log("");
  console.log("=== PURE DQN TRAINING ===");
  console.log("No teacher. No imitation. No heuristic.");
  console.log("Exploration = mostly wait, sometimes random flap.");
  console.log(`Episodes:      ${EPISODES}`);
  console.log(`Win score:     ${WIN_SCORE}`);
  console.log(`Eval every:    ${EVAL_EVERY}`);
  console.log(`Eval episodes: ${EVAL_EPISODES}`);
  console.log(`Random flap p: ${RANDOM_FLAP_PROBABILITY}`);
  console.log(`Output:        ${MODEL_PATH}`);
  console.log("");
  console.log("Game config:");
  console.log(`  size:  ${GAME_CONFIG.width}x${GAME_CONFIG.height}`);
  console.log(`  gap:   ${GAME_CONFIG.pipeGapMin}–${GAME_CONFIG.pipeGapMax}`);
  console.log(`  speed: ${GAME_CONFIG.pipeSpeed}`);
  console.log("");

  for (let episode = 1; episode <= EPISODES; episode += 1) {
    const result = playEpisode({
      agent,
      episode,
      explore: true,
      learn: true,
    });

    if (episode <= 30 || episode % 10 === 0) {
      console.log(
        `Episode ${String(episode).padStart(6)} | ` +
          `Score: ${String(result.score).padStart(3)} | ` +
          `Frames: ${String(result.frames).padStart(5)} | ` +
          `Reward: ${result.totalReward.toFixed(2).padStart(9)} | ` +
          `Loss: ${result.loss.toFixed(5).padStart(9)} | ` +
          `Eps: ${agent.epsilon.toFixed(3)} | ` +
          `Mem: ${agent.memory.length}`,
      );
    }

    if (episode % EVAL_EVERY === 0) {
      const evalResult = evaluate(agent, episode);

      console.log("");
      console.log(
        `EVAL ${episode} | ` +
          `Wins: ${evalResult.wins}/${EVAL_EPISODES} | ` +
          `Avg: ${evalResult.avg.toFixed(2)} | ` +
          `Min: ${evalResult.min} | ` +
          `Max: ${evalResult.max} | ` +
          `Scores: [${evalResult.scores.join(", ")}]`,
      );

      const hasLearnedSomething = evalResult.max > 0;

      const improved =
        hasLearnedSomething &&
        (evalResult.wins > bestWins ||
          (evalResult.wins === bestWins && evalResult.avg > bestAvg) ||
          (evalResult.wins === bestWins &&
            evalResult.avg === bestAvg &&
            evalResult.min > bestMin) ||
          (evalResult.wins === bestWins &&
            evalResult.avg === bestAvg &&
            evalResult.min === bestMin &&
            evalResult.max > bestMax));

      if (improved) {
        bestWins = evalResult.wins;
        bestAvg = evalResult.avg;
        bestMin = evalResult.min;
        bestMax = evalResult.max;

        saveModel(agent, MODEL_PATH);
        saveModel(
          agent,
          path.join(
            CHECKPOINT_DIR,
            `cpu-model-ep${episode}-wins${bestWins}-avg${bestAvg.toFixed(
              2,
            )}-min${bestMin}-max${bestMax}.json`,
          ),
        );

        console.log(
          `SAVED BEST â†’ Wins: ${bestWins}/${EVAL_EPISODES} | ` +
            `Avg: ${bestAvg.toFixed(2)} | Min: ${bestMin} | Max: ${bestMax}`,
        );
      } else if (!hasLearnedSomething) {
        console.log("Not saving yet: evaluation max is still 0.");
      }

      console.log("");
    }
  }

  console.log("");
  console.log("Training finished.");
  console.log(`Best model path: ${MODEL_PATH}`);
  console.log("");
}

main();
