export type ForwardCache = {
  input: number[];
  z1: number[];
  a1: number[];
  z2: number[];
  a2: number[];
  output: number[];
};

function randomWeight(fanIn: number): number {
  // He-like initialization for ReLU layers.
  return (Math.random() * 2 - 1) * Math.sqrt(2 / fanIn);
}

function createMatrix(rows: number, cols: number, fanIn: number): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => randomWeight(fanIn)),
  );
}

function createVector(size: number): number[] {
  return Array.from({ length: size }, () => 0);
}

function relu(x: number): number {
  return x > 0 ? x : 0;
}

function reluDerivative(x: number): number {
  return x > 0 ? 1 : 0;
}

function dot(input: number[], weights: number[][], bias: number[]): number[] {
  const output = Array.from({ length: bias.length }, (_, j) => bias[j]);

  for (let i = 0; i < input.length; i += 1) {
    for (let j = 0; j < bias.length; j += 1) {
      output[j] += input[i] * weights[i][j];
    }
  }

  return output;
}

export class SimpleNetwork {
  inputSize: number;
  hiddenSize1: number;
  hiddenSize2: number;
  outputSize: number;

  w1: number[][];
  b1: number[];

  w2: number[][];
  b2: number[];

  w3: number[][];
  b3: number[];

  constructor(
    inputSize: number,
    hiddenSize1: number,
    hiddenSize2: number,
    outputSize: number,
  ) {
    this.inputSize = inputSize;
    this.hiddenSize1 = hiddenSize1;
    this.hiddenSize2 = hiddenSize2;
    this.outputSize = outputSize;

    this.w1 = createMatrix(inputSize, hiddenSize1, inputSize);
    this.b1 = createVector(hiddenSize1);

    this.w2 = createMatrix(hiddenSize1, hiddenSize2, hiddenSize1);
    this.b2 = createVector(hiddenSize2);

    this.w3 = createMatrix(hiddenSize2, outputSize, hiddenSize2);
    this.b3 = createVector(outputSize);
  }

  forward(input: number[]): number[] {
    return this.forwardWithCache(input).output;
  }

  forwardWithCache(input: number[]): ForwardCache {
    const z1 = dot(input, this.w1, this.b1);
    const a1 = z1.map(relu);

    const z2 = dot(a1, this.w2, this.b2);
    const a2 = z2.map(relu);

    const output = dot(a2, this.w3, this.b3);

    return {
      input,
      z1,
      a1,
      z2,
      a2,
      output,
    };
  }

  trainOne(input: number[], target: number[], learningRate: number): number {
    const cache = this.forwardWithCache(input);

    const dOutput = createVector(this.outputSize);
    let loss = 0;

    for (let i = 0; i < this.outputSize; i += 1) {
      const error = cache.output[i] - target[i];
      loss += 0.5 * error * error;
      dOutput[i] = error;
    }

    const dW3 = createMatrix(this.hiddenSize2, this.outputSize, this.hiddenSize2);
    const db3 = createVector(this.outputSize);

    const dA2 = createVector(this.hiddenSize2);

    for (let j = 0; j < this.hiddenSize2; j += 1) {
      for (let k = 0; k < this.outputSize; k += 1) {
        dW3[j][k] = cache.a2[j] * dOutput[k];
        dA2[j] += dOutput[k] * this.w3[j][k];
      }
    }

    for (let k = 0; k < this.outputSize; k += 1) {
      db3[k] = dOutput[k];
    }

    const dZ2 = dA2.map((value, index) => value * reluDerivative(cache.z2[index]));

    const dW2 = createMatrix(this.hiddenSize1, this.hiddenSize2, this.hiddenSize1);
    const db2 = createVector(this.hiddenSize2);

    const dA1 = createVector(this.hiddenSize1);

    for (let i = 0; i < this.hiddenSize1; i += 1) {
      for (let j = 0; j < this.hiddenSize2; j += 1) {
        dW2[i][j] = cache.a1[i] * dZ2[j];
        dA1[i] += dZ2[j] * this.w2[i][j];
      }
    }

    for (let j = 0; j < this.hiddenSize2; j += 1) {
      db2[j] = dZ2[j];
    }

    const dZ1 = dA1.map((value, index) => value * reluDerivative(cache.z1[index]));

    const dW1 = createMatrix(this.inputSize, this.hiddenSize1, this.inputSize);
    const db1 = createVector(this.hiddenSize1);

    for (let i = 0; i < this.inputSize; i += 1) {
      for (let j = 0; j < this.hiddenSize1; j += 1) {
        dW1[i][j] = cache.input[i] * dZ1[j];
      }
    }

    for (let j = 0; j < this.hiddenSize1; j += 1) {
      db1[j] = dZ1[j];
    }

    for (let i = 0; i < this.inputSize; i += 1) {
      for (let j = 0; j < this.hiddenSize1; j += 1) {
        this.w1[i][j] -= learningRate * dW1[i][j];
      }
    }

    for (let j = 0; j < this.hiddenSize1; j += 1) {
      this.b1[j] -= learningRate * db1[j];
    }

    for (let i = 0; i < this.hiddenSize1; i += 1) {
      for (let j = 0; j < this.hiddenSize2; j += 1) {
        this.w2[i][j] -= learningRate * dW2[i][j];
      }
    }

    for (let j = 0; j < this.hiddenSize2; j += 1) {
      this.b2[j] -= learningRate * db2[j];
    }

    for (let i = 0; i < this.hiddenSize2; i += 1) {
      for (let j = 0; j < this.outputSize; j += 1) {
        this.w3[i][j] -= learningRate * dW3[i][j];
      }
    }

    for (let j = 0; j < this.outputSize; j += 1) {
      this.b3[j] -= learningRate * db3[j];
    }

    return loss;
  }

  clone(): SimpleNetwork {
    const copy = new SimpleNetwork(
      this.inputSize,
      this.hiddenSize1,
      this.hiddenSize2,
      this.outputSize,
    );

    copy.copyFrom(this);

    return copy;
  }

  copyFrom(other: SimpleNetwork) {
    this.w1 = other.w1.map((row) => [...row]);
    this.b1 = [...other.b1];

    this.w2 = other.w2.map((row) => [...row]);
    this.b2 = [...other.b2];

    this.w3 = other.w3.map((row) => [...row]);
    this.b3 = [...other.b3];
  }
}
