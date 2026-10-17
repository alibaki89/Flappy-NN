# Architecture — Flappy NN

## Runtime topology

`src/app/page.tsx` -> `src/components/game/VsCpuGame.tsx` -> `src/game/core/flappyEngine.ts` for both players, and `src/game/ai/loadCpuModel.ts` + `src/game/ai/dqnAgent.ts` for the CPU.

The live game creates two runtime objects with the same seed. Each object advances under the same physics and terrain plan, but uses different actions. The human is controlled by UI input; the CPU produces greedy actions from serialized neural network weights.

`src/game/core/terrain.ts` builds procedural pipe plans from a seed; `config.ts` fixes world dimensions, physics and collision constants; `flappyEngine.ts` advances bird velocity and position, scrolls terrain, checks elliptical hitboxes against pipe rectangles, detects ground/top collisions and counts passed pipes.

## Offline ML pipeline

`scripts/train-cpu.ts` -> `DqnAgent` (`dqnAgent.ts`) -> `SimpleNetwork` (`simpleNetwork.ts`). Episodes generate tuples `(state, action, reward, next_state, done)` and store them in replay memory. Training samples batches, generates one-step temporal-difference targets from a separate target network, applies squared-error gradients using handwritten backpropagation, and syncs the target network periodically. The current training script uses task-specific reward shaping; the separate `reward.ts` module defines an additional reward function that is not the main script's complete training objective.

`scripts/eval-cpu.ts` and `scripts/eval-cpu-random.ts` load `public/models/cpu-model.json` without training. Random-terrain evaluations use newly generated seeds and can save JSON logs. `scripts/inspect-crash.ts` supports investigating a failing seed. Training writes checkpoint files to `public/models/checkpoints` and the final model to `public/models/cpu-model.json`.

## Model and asset invariants

- Browser code fetches `/models/cpu-model.json` and expects the existing serialized model schema.
- The About slideshow references `/models/flappy-nn-weights.txt` and `/about/about-first-slide.jpg`.
- Leave `public/models/cpu-model.json` at its current path and preserve it byte for byte to retain the deployed policy.
- Retain `src/game/core` and `src/game/ai` import paths; no source code relocations were made in this cleanup.
- Keep the Hugging Face YAML metadata in the **Space** README and the Dockerfile port 7860.
