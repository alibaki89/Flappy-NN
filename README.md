# Flappy NN

**A browser game where a human competes against a trained, manually implemented Deep Q-Network on the same deterministic Flappy-style terrain.**

[**Live Hugging Face Space**](https://huggingface.co/spaces/abp89aa/flappy-nn) · [**Live application**](https://abp89aa-flappy-nn.hf.space/) · [**Technical report**](docs/TECHNICAL_REPORT.md) ([PDF](docs/TECHNICAL_REPORT.pdf)) · [**Training and evaluation**](docs/TRAINING.md)

## What is implemented

The player and the CPU run on the same terrain seed, with identical pipe layouts, gravity, speed, collision and gap rules. The CPU consumes **nine normalized game-state values**, not pixels or hand-coded flap thresholds. A `9 → 64 → 64 → 2` neural network outputs action values for `wait` and `flap`; the deployed opponent chooses the action with the higher Q-value. Training and neural-network mathematics are implemented directly in TypeScript, without an external deep-learning library.

```text
same terrain seed ─┬─> human-controlled game ─┐
                   └─> model-controlled game ─┼─> side-by-side comparison
                         state (9)            │
                          ↓                   │
                      network (4,930 params)  │
                          ↓                   │
                     Q(wait), Q(flap) ────────┘
```

The real playable match is at `/` (desktop/laptop layout). The About page at `/about` explains the AI and includes a downloadable weight-text artifact. Some additional routes are non-playable placeholders; the completed public experience is the player-versus-CPU match.

## Project layout

```text
src/app/             Next.js routes, app layout and styles
src/components/      match UI, background elements, About slideshow, navigation
src/game/core/       seeded terrain, physics, collisions, score and state vector
src/game/ai/         neural network, DQN agent, rewards and model loading
scripts/             offline training, evaluation and crash inspection
public/models/       canonical runtime model, historical unique checkpoints,
                     archived evaluation logs and downloadable weights
public/about/        About slideshow image asset
docs/                technical report, architecture and training notes
Dockerfile           Hugging Face container on port 7860
```

## Run locally

**Requires Node.js 22** (matching the Docker image) and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. For a production-style build:

```bash
npm run build
npm run start
```

The included `Dockerfile` builds and serves the Next.js app on port 7860. The main opponent is loaded from `public/models/cpu-model.json` on each browser session; its weights are not updated by browser-time gameplay.

## Training and evaluation

```bash
npm run eval:cpu                  # evaluation with predefined settings
npm run eval:cpu:random -- 30 1000
npm run train:cpu -- 5000         # may UPDATE public/models/cpu-model.json
```

**Caution:** `train:cpu` loads the current model if present and saves back to the canonical path. Back up `public/models/cpu-model.json` before starting training. It also creates checkpoint files under `public/models/checkpoints`; the random evaluation script writes logs under `public/models/eval-reports`. See [`docs/TRAINING.md`](docs/TRAINING.md) for the learning rule, seeds, measurements and what the published results do (and do not) prove.

An archived report in this source snapshot records **30 wins in 30 episodes at a target score of 1,000 on randomly seeded terrain**. This report is preserved in `public/models/eval-reports`; it is an *existing recorded result*, not a newly repeated benchmark for this repository cleanup. There is no full CI-driven regression suite in the archive.

## Technical highlights

- Deterministic terrain generation and consistent physics for human/CPU competition.
- Hand-written fully-connected ReLU network and backpropagation.
- Experience replay, epsilon exploration, target network synchronization and squared-error temporal-difference optimization.
- Separate terminal training/evaluation utilities and frozen browser inference.
- JSON-serialized parameters: `(9×64+64) + (64×64+64) + (64×2+2) = 4,930`.

**Accuracy note:** The historical `PROJECT_SPEC.md` mentions Double DQN and Huber loss. Those are proposals in the original specification; the current training code uses **standard target-network DQN and squared-error loss**. The technical report documents the algorithm that actually runs.

## Licensing

The published source currently has no general open-source licence. See [licensing information](docs/LICENSING.md).
