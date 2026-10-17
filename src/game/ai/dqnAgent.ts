import { SimpleNetwork } from "./simpleNetwork";
import type { GameAction } from "../core/config";

export type Transition = {
  state: number[];
  action: GameAction;
  reward: number;
  nextState: number[];
  done: boolean;
  source: "cpu" | "human";
};

export type DqnDecision = {
  action: GameAction;
  qWait: number;
  qFlap: number;
};

export type TrainingSummary = {
  trained: boolean;
  loss: number;
  memorySize: number;
  trainSteps: number;
};

export type SerializedDqnModel = {
  version: 1;
  inputSize: number;
  hiddenSize1: number;
  hiddenSize2: number;
  outputSize: number;
  weights: {
    w1: number[][];
    b1: number[];
    w2: number[][];
    b2: number[];
    w3: number[][];
    b3: number[];
  };
  training?: {
    epsilon?: number;
    trainSteps?: number;
  };
};

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function argmax(values: number[]): 0 | 1 {
  return values[1] > values[0] ? 1 : 0;
}

export class DqnAgent {
  online: SimpleNetwork;
  target: SimpleNetwork;

  memory: Transition[] = [];

  maxMemory = 30000;
  batchSize = 64;

  gamma = 0.97;
  learningRate = 0.0007;

  epsilon = 0.08;
  epsilonMin = 0.02;
  epsilonDecay = 0.9995;

  trainSteps = 0;
  targetSyncEvery = 400;

  constructor() {
    this.online = new SimpleNetwork(9, 64, 64, 2);
    this.target = this.online.clone();
  }

  chooseAction(state: number[], explore: boolean): DqnDecision {
    const qValues = this.online.forward(state);

    let action = argmax(qValues);

    if (explore && Math.random() < this.epsilon) {
      action = Math.random() < 0.5 ? 0 : 1;
    }

    return {
      action,
      qWait: qValues[0],
      qFlap: qValues[1],
    };
  }

  remember(transition: Transition) {
    this.memory.push(transition);

    // Pure RL, but better replay balance:
    // pipe-pass / high-reward moments are rare, so keep extra copies.
    // Otherwise memory becomes dominated by early deaths.
    if (transition.reward >= 10) {
      for (let i = 0; i < 8; i += 1) {
        this.memory.push({ ...transition });
      }
    } else if (transition.reward >= 4) {
      for (let i = 0; i < 3; i += 1) {
        this.memory.push({ ...transition });
      }
    }

    while (this.memory.length > this.maxMemory) {
      this.memory.shift();
    }
  }

  train(iterations: number): TrainingSummary {
    if (this.memory.length < this.batchSize) {
      return {
        trained: false,
        loss: 0,
        memorySize: this.memory.length,
        trainSteps: this.trainSteps,
      };
    }

    let totalLoss = 0;
    let updates = 0;

    for (let i = 0; i < iterations; i += 1) {
      const batch = Array.from({ length: this.batchSize }, () =>
        randomItem(this.memory),
      );

      for (const transition of batch) {
        const prediction = this.online.forward(transition.state);
        const target = [...prediction];

        if (transition.done) {
          target[transition.action] = transition.reward;
        } else {
          const nextQ = this.target.forward(transition.nextState);
          target[transition.action] =
            transition.reward + this.gamma * Math.max(nextQ[0], nextQ[1]);
        }

        totalLoss += this.online.trainOne(
          transition.state,
          target,
          this.learningRate,
        );

        updates += 1;
        this.trainSteps += 1;

        if (this.trainSteps % this.targetSyncEvery === 0) {
          this.target.copyFrom(this.online);
        }
      }
    }

    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);

    return {
      trained: true,
      loss: totalLoss / Math.max(1, updates),
      memorySize: this.memory.length,
      trainSteps: this.trainSteps,
    };
  }

  exportModelData(): SerializedDqnModel {
    return {
      version: 1,
      inputSize: this.online.inputSize,
      hiddenSize1: this.online.hiddenSize1,
      hiddenSize2: this.online.hiddenSize2,
      outputSize: this.online.outputSize,
      weights: {
        w1: this.online.w1,
        b1: this.online.b1,
        w2: this.online.w2,
        b2: this.online.b2,
        w3: this.online.w3,
        b3: this.online.b3,
      },
      training: {
        epsilon: this.epsilon,
        trainSteps: this.trainSteps,
      },
    };
  }

  loadModelData(data: SerializedDqnModel) {
    if (data.version !== 1) {
      throw new Error(`Unsupported model version: ${data.version}`);
    }

    if (
      data.inputSize !== 9 ||
      data.hiddenSize1 !== 64 ||
      data.hiddenSize2 !== 64 ||
      data.outputSize !== 2
    ) {
      throw new Error(
        `Model architecture mismatch. Expected 9 → 64 → 64 → 2.`,
      );
    }

    this.online.w1 = data.weights.w1.map((row) => [...row]);
    this.online.b1 = [...data.weights.b1];

    this.online.w2 = data.weights.w2.map((row) => [...row]);
    this.online.b2 = [...data.weights.b2];

    this.online.w3 = data.weights.w3.map((row) => [...row]);
    this.online.b3 = [...data.weights.b3];

    this.target.copyFrom(this.online);

    this.epsilon = data.training?.epsilon ?? this.epsilon;
    this.trainSteps = data.training?.trainSteps ?? this.trainSteps;
  }
}
