# Flappy NN — Project Specification

## 1. Project Vision

Flappy NN is a web-based AI learning game inspired by obstacle-avoidance flying games.

The project has three goals:

1. Let users play a polished flying game.
2. Let users compete against a trained neural-network CPU.
3. Teach reinforcement learning and neural network math visually.

The project must be web-first, privacy-first, copyright-safe, and later portable to Android and iOS.

---

## 2. Platforms

### First target
- Website

### Later targets
- Android app
- iOS app

The project should be designed so the web version can later be wrapped for mobile using a web-to-mobile framework such as Capacitor.

---

## 3. Main Game Modes

### 3.1 Solo Play
The user plays alone.

Purpose:
- Practice
- Learn the game
- Generate optional gameplay data for training

### 3.2 Vs CPU
The user plays against the trained AI model.

Rules:
- Human and AI get the same terrain.
- Same pipe/obstacle sequence.
- Same speed.
- Same difficulty.
- Round ends when one side loses.
- If human dies first, CPU wins.
- If CPU dies first, human wins.
- If both die on the same frame, it is a draw.

### 3.3 Online Friend Match
Two humans play against each other online.

Rules:
- Both players get the same deterministic terrain seed.
- Each player plays locally.
- Server synchronizes room state, score, death state, and winner.
- Face avatar data must not be transmitted by default.

### 3.4 AI Lab
A mode for watching the AI play and learn.

Shows:
- Current state values
- Q-values
- Action decision
- Reward
- Score
- Loss
- Epsilon
- Neural network visualization
- Replay/training metrics

### 3.5 Learn Tab
Explains the project.

Topics:
- What reinforcement learning is
- What state/action/reward mean
- Neural network layers
- Weights
- Biases
- ReLU
- Q-values
- Argmax
- DQN
- Replay memory
- Target network
- Why training can degrade
- Why evaluation is separate from training

---

## 4. Visual Design

The game should look polished, sharp, and original.

Style:
- Clean vector-like art
- Smooth animation
- High-quality sky/background
- Original bird/character design
- Original obstacle design
- No copyrighted assets
- No Flappy Bird name, logo, sprites, sounds, or copied pipe art

Possible style:
- Soft gradient sky
- Procedural clouds
- Clean geometric obstacles
- Smooth bird animation
- Modern UI panels

Temporary project name:
- Flappy NN

This name may change later.

---

## 5. Privacy-First Face Avatar Feature

Users can upload a face/photo locally so the bird/avatar visually becomes their face.

Privacy requirements:
- Image must never be uploaded to the server.
- Image must not be stored in a database.
- Image must not be stored in localStorage.
- Image must not be stored in IndexedDB.
- Image must not be sent to opponents by default.
- Image must exist only in browser memory during the session.
- Image must reset on refresh, tab close, or manual reset.
- No biometric identification.
- No face recognition.
- No face embeddings.
- No identity matching.

Implementation:
- User selects image with file input.
- Browser creates temporary object URL.
- Image is drawn locally to canvas.
- User manually crops/masks it.
- Cropped image becomes an in-memory texture.
- On reset/unload, object URL is revoked and memory references cleared.

Online mode:
- By default, opponents do not receive the face avatar.
- Opponents see a generic avatar.
- Sharing avatar with friend, if ever added, must be explicit opt-in.

---

## 6. Game Engine Requirements

The game should run in the browser.

Possible rendering choices:
- HTML Canvas first
- PixiJS later if needed
- Avoid overcomplicating with WebGL at the beginning

The game loop must support:
- deterministic updates
- pause/resume
- fixed timestep or stable delta handling
- replayable terrain
- same terrain for AI and human
- mobile touch input later

---

## 7. Deterministic Terrain

All matches must use seeded terrain generation.

A terrain seed generates:
- obstacle gap positions
- obstacle timing
- speed progression
- difficulty parameters

This is required for:
- fair human vs AI matches
- fair online matches
- repeatable evaluation
- debugging
- training comparison

Example:
seed = "match-123"

Both human and AI receive the same generated terrain sequence.

---

## 8. AI State

The AI should not see pixels at first.

The AI receives numeric state values.

Initial state vector:

1. bird_y
2. bird_velocity
3. pipe_distance
4. gap_y
5. y_difference
6. pipe_speed
7. gap_size
8. time_to_pipe
9. previous_action

So the input size is:

9 inputs

Later we may add:
- cooldown remaining
- normalized score
- next-next pipe information

---

## 9. AI Actions

The action space is simple:

0 = wait
1 = flap

The environment may enforce a flap cooldown for realistic physics.

---

## 10. Neural Network

Initial architecture:

9 inputs → 64 hidden neurons → 64 hidden neurons → 2 outputs

Outputs:
- Q(wait)
- Q(flap)

Decision:
- Choose action with argmax(Q-values)

The network should be educational and visualizable.

We may start with a custom TypeScript neural network for learning purposes.

Later, we may optionally support TensorFlow.js.

---

## 11. Training Algorithm

Use DQN-style reinforcement learning.

Required features:
- Experience replay
- Positive/important memory
- Double DQN target
- Target network
- Huber loss
- Reward clipping or bounded Q-targets
- Checkpoint saving
- Best checkpoint saving
- Evaluation mode with epsilon = 0

Training and evaluation must be separate.

Never judge the model only by training scores.

---

## 12. Rewards

Beginner reward design:

- small reward for staying alive
- reward for moving closer to gap center
- reward for staying near gap center
- strong reward for passing obstacle
- penalty for crashing
- success reward for reaching win score

The reward should help learning without directly hard-coding:
"If below gap, flap."

---

## 13. Win Conditions

Because endless survival is unrealistic, each difficulty has a win score.

Initial targets:

Beginner:
- Win score: 30

Intermediate:
- Win score: 50

Advanced:
- Win score: 100

A model is considered strong when it wins most evaluation runs.

Example:
- Beginner solved: 27/30 wins
- Strong beginner: 30/30 wins or near 30/30

---

## 14. Evaluation

Evaluation must run with:

epsilon = 0

For beginner:
- 30 evaluation episodes
- same difficulty
- optionally different seeds

Metrics:
- wins / 30
- average score
- minimum score
- maximum score
- score list

Best model selection:
1. highest win count
2. highest average score
3. highest minimum score
4. highest maximum score

The latest checkpoint is not necessarily the best checkpoint.

---

## 15. Human Gameplay as Training Data

Human gameplay can be used as training data.

Collected per frame:
- state
- human action
- reward
- next state
- done

Rules:
- high-score human gameplay is valuable
- bad human gameplay should not blindly teach the AI
- if human beats AI, trajectory may be stored as important memory
- if human reaches win score, trajectory may be used as demonstration data

Important:
The AI should not update during a live match.
The AI should train after the round ends.

---

## 16. Vs CPU Match Rules

Layout:
- left side: AI
- right side: human

Both use:
- same terrain seed
- same difficulty
- same obstacle sequence

During round:
- AI model is frozen
- human controls right side
- both gameplay trajectories are recorded

After round:
- show winner
- show score comparison
- optionally train AI from collected data
- optionally save replay

---

## 17. Online Friend Mode

Initial online design:
- room code
- same terrain seed
- each client simulates locally
- server synchronizes room status
- server records winner/score only

Do not send:
- face image
- biometric data
- private avatar data

By default:
- each user sees their own local face avatar
- opponents see generic avatar

---

## 18. Mobile Plan

After web version works:
- Convert to PWA
- Add touch controls
- Add responsive layout
- Package with Capacitor for Android/iOS

Do not start mobile before the web version is stable.

---

## 19. Development Milestones

### Milestone 1
Create Next.js + TypeScript project.

### Milestone 2
Build beautiful single-player browser game.

### Milestone 3
Add deterministic terrain seed system.

### Milestone 4
Add solo play mode.

### Milestone 5
Add CPU agent interface.

### Milestone 6
Port DQN architecture to TypeScript or integrate TensorFlow.js.

### Milestone 7
Add evaluation mode and checkpoints.

### Milestone 8
Train CPU to solve beginner.

### Milestone 9
Add AI vs human split-screen mode.

### Milestone 10
Add local-only face avatar feature.

### Milestone 11
Add Learn tab with NN/math explanations.

### Milestone 12
Add online friend match.

### Milestone 13
Add mobile/PWA support.

---

## 20. Non-Goals For First Version

Do not start with:
- online multiplayer
- mobile packaging
- face detection
- raw-pixel AI
- complex physics
- huge neural networks
- copyrighted assets
- server-side biometric handling

First version should prove:
- polished browser game
- deterministic terrain
- AI can play
- human can compete with AI
- privacy-first avatar works locally
