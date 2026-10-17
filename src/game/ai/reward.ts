export function computeReward({
  previousScore,
  nextScore,
  nextState,
  done,
  source,
}: {
  previousScore: number;
  nextScore: number;
  nextState: number[];
  done: boolean;
  source: "cpu" | "human";
}): number {
  const scoreGain = nextScore - previousScore;

  // nextState[4] = yDifference / gameHeight.
  // Smaller absolute value means closer to the gap center.
  const centerDistance = Math.min(1, Math.abs(nextState[4]));

  let reward = 0;

  reward += 0.03; // staying alive
  reward += (1 - centerDistance) * 0.08; // being near the gap center
  reward += scoreGain * 8.0; // passing a pipe

  if (done) {
    reward -= 8.0;
  }

  // Human demonstrations are useful, but not automatically "correct".
  // Good human actions already get good reward through the same formula.
  if (source === "human" && scoreGain > 0) {
    reward += 2.0;
  }

  return reward;
}
