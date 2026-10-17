import type { GameAction } from "../core/config";

export type CpuModelDecision = {
  action: GameAction;
  qWait: number;
  qFlap: number;
};

export function chooseCpuAction(state: number[]): CpuModelDecision {
  const birdVelocity = state[1];
  const pipeDistance = state[2];
  const yDifference = state[4];

  const birdIsBelowGap = yDifference > 0.03;
  const birdIsFallingOrStable = birdVelocity > -0.34;
  const pipeIsRelevant = pipeDistance < 0.82;

  const shouldFlap = pipeIsRelevant && birdIsBelowGap && birdIsFallingOrStable;

  return {
    action: shouldFlap ? 1 : 0,

    // Temporary debug values.
    // Later these will be real neural-network Q-values.
    qWait: shouldFlap ? 0.3 : 0.8,
    qFlap: shouldFlap ? 0.9 : 0.2,
  };
}
