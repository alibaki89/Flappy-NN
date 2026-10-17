# Training and evaluation — Flappy NN

## Network

The feedforward network in `src/game/ai/simpleNetwork.ts` has nine inputs, two 64-unit ReLU hidden layers and two linear action-value outputs. Inputs come from `getAiState()` in `flappyEngine.ts`: normalized bird position and vertical speed, distance to next pipe, next gap center, signed difference to gap center, horizontal pipe speed, gap size, time until pipe arrival and previous action. It does not process screenshots.

Parameters: `9*64 + 64 + 64*64 + 64 + 64*2 + 2 = 4,930`. Model export/import is handled by `DqnAgent` via JSON serialization. The deployed model is `public/models/cpu-model.json`.

## Training loop and target

`scripts/train-cpu.ts` runs training episodes on deterministic seeds of the form `dqn-<episode>`. Training action selection is epsilon-greedy; *exploration* chooses `flap` with probability `0.045` rather than uniform 50/50, because random flapping is highly destructive in this task. The reward used by the training script adds living reward, alignment improvement, proximity to gap center, pipe-pass bonus, small flap penalty, terminal loss, and goal completion bonus.

`DqnAgent.train` draws replay transitions and computes a one-step target:

`y = r` if terminal, otherwise `y = r + gamma * max_a' Q_target(s', a')`.

The action-specific output of the online network is trained against `y`; the other output retains its current prediction. `SimpleNetwork.trainOne` backpropagates the squared loss `0.5 * Σ_i (Q_i - target_i)^2` through the ReLU layers. `DqnAgent` periodically copies online weights to a target network. **This is standard target-network DQN, not Double DQN** (there is no separate online-network argmax for the target selection). The loss is squared error, not Huber loss. The original project spec discusses alternatives that were not implemented.

## Commands

```bash
npm ci
npm run eval:cpu
npm run eval:cpu:random -- 30 1000
npm run train:cpu -- 5000
```

- `eval:cpu` evaluates the frozen model against prescribed deterministic seeds.
- `eval:cpu:random` creates random evaluation seeds and writes a JSON report to `public/models/eval-reports/`.
- `train:cpu` performs gradient updates, writes model checkpoints to `public/models/checkpoints/`, and **may replace** `public/models/cpu-model.json`. Back up the canonical model first.
- `npx tsx scripts/inspect-crash.ts "SEED"` inspects a recorded failure seed.

No training runs occur inside the user's browser. The browser only loads a saved model and selects greedy Q-actions.

## Reported evidence and limitations

Archived evaluation JSON files include a report describing 30/30 `win` results at a target of 1,000 pipes. Preserve exact logs when citing that number; the seeds and outcomes in the report are evidence of a prior run, **not a fresh independently replicated experiment for the documentation release**.

A stronger evaluation should publish model hash, random-seed derivation, game configuration, number of trials, a distribution of scores, failure cases and enough raw logs to re-run each trial. Beware that evaluating a checkpoint repeatedly on overlapping or training-like terrain does not by itself establish broad generalization. Training is stochastic, and the game is a deliberately simplified simulation.

## Model checkpoints

The model directory contains the canonical runtime model and eight distinct saved training checkpoints. Archived random-terrain evaluation reports are stored separately in `public/models/eval-reports/`. Checkpoint labels record saved evaluation summaries and should not be interpreted as a complete continuous training history.
