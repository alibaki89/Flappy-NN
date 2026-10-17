export const GAME_CONFIG = {
  width: 420,
  height: 600,
  groundHeight: 78,

  birdX: 112,

  // Bird-body ellipse hitbox.
  birdHitboxRadiusX: 17,
  birdHitboxRadiusY: 14,

  // Small forgiveness margin around pipe collision.
  collisionGrace: 4,

  gravity: 0.34,
  flapStrength: -6.4,

  pipeWidth: 44,

  // Pipe speed stays the same.
  pipeSpeed: 1.95,

  // Variable pipe gap range.
  // Old fixed gap was 172.
  pipeGapMin: 150,
  pipeGapMax: 190,

  pipeSpacing: 275,
  firstPipeX: 350,
} as const;

export type GameAction = 0 | 1;
