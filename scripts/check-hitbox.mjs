import fs from "fs";

const configText = fs.readFileSync("src/game/core/config.ts", "utf8");

function readNumber(name) {
  const match = configText.match(new RegExp(`${name}:\\s*([0-9.]+)`));

  if (!match) {
    throw new Error(`Could not find ${name} in config.ts`);
  }

  return Number(match[1]);
}

const config = {
  width: readNumber("width"),
  height: readNumber("height"),
  groundHeight: readNumber("groundHeight"),
  birdX: readNumber("birdX"),
  birdHitboxRadiusX: readNumber("birdHitboxRadiusX"),
  birdHitboxRadiusY: readNumber("birdHitboxRadiusY"),
  collisionGrace: readNumber("collisionGrace"),
  pipeWidth: readNumber("pipeWidth"),
  pipeGapMin: readNumber("pipeGapMin"),
  pipeGapMax: readNumber("pipeGapMax"),
};

const defaultGapSize = (config.pipeGapMin + config.pipeGapMax) / 2;

const gapY = Number(process.argv[2] ?? config.height * 0.5);
const pipeX = Number(process.argv[3] ?? config.birdX + 10);
const birdY = Number(process.argv[4] ?? gapY);
const gapSize = Number(process.argv[5] ?? defaultGapSize);

const gapTop = gapY - gapSize / 2;
const gapBottom = gapY + gapSize / 2;

const visualPipeLeft = pipeX;
const visualPipeRight = pipeX + config.pipeWidth;

const collisionPipeLeft = pipeX + config.collisionGrace;
const collisionPipeRight = pipeX + config.pipeWidth - config.collisionGrace;

const collisionGapTop = gapTop - config.collisionGrace;
const collisionGapBottom = gapBottom + config.collisionGrace;

function ellipseOverlapsRect(cx, cy, rx, ry, left, top, right, bottom) {
  const closestX = Math.max(left, Math.min(cx, right));
  const closestY = Math.max(top, Math.min(cy, bottom));

  const nx = (closestX - cx) / rx;
  const ny = (closestY - cy) / ry;

  return nx * nx + ny * ny <= 1;
}

function testAtY(y) {
  const hitsTop = ellipseOverlapsRect(
    config.birdX,
    y,
    config.birdHitboxRadiusX,
    config.birdHitboxRadiusY,
    collisionPipeLeft,
    0,
    collisionPipeRight,
    collisionGapTop,
  );

  const hitsBottom = ellipseOverlapsRect(
    config.birdX,
    y,
    config.birdHitboxRadiusX,
    config.birdHitboxRadiusY,
    collisionPipeLeft,
    collisionGapBottom,
    collisionPipeRight,
    config.height - config.groundHeight,
  );

  return hitsTop || hitsBottom;
}

const hit = testAtY(birdY);

const safeCenterTop =
  gapTop + config.birdHitboxRadiusY - config.collisionGrace;

const safeCenterBottom =
  gapBottom - config.birdHitboxRadiusY + config.collisionGrace;

const safeCenterHeight = safeCenterBottom - safeCenterTop;

console.log("");
console.log("=== ELLIPSE HITBOX CHECK ===");
console.log("");

console.log("Bird collision shape:");
console.log(`  ellipse center:       x=${config.birdX}, y=${birdY}`);
console.log(`  radiusX:              ${config.birdHitboxRadiusX}`);
console.log(`  radiusY:              ${config.birdHitboxRadiusY}`);
console.log(
  `  total size approx:    ${config.birdHitboxRadiusX * 2} × ${
    config.birdHitboxRadiusY * 2
  }`,
);
console.log("");

console.log("Pipe:");
console.log(`  visual x:             ${visualPipeLeft} → ${visualPipeRight}`);
console.log(
  `  collision x:          ${collisionPipeLeft} → ${collisionPipeRight}`,
);
console.log(`  visual width:         ${config.pipeWidth}`);
console.log(`  collision grace:      ${config.collisionGrace}`);
console.log(`  configured gap range: ${config.pipeGapMin} → ${config.pipeGapMax}`);
console.log(`  tested gap size:      ${gapSize}`);
console.log(`  visual gap:           ${gapTop} → ${gapBottom}`);
console.log(`  collision gap:        ${collisionGapTop} → ${collisionGapBottom}`);
console.log("");

console.log("Safe vertical center range when horizontally overlapping:");
console.log(`  bird center Y:        ${safeCenterTop} → ${safeCenterBottom}`);
console.log(`  safe vertical band:   ${safeCenterHeight}`);
console.log("");

console.log("Collision test:");
console.log(`  RESULT:               ${hit ? "HIT" : "PASS"}`);
console.log("");

console.log("Usage:");
console.log("  node scripts/check-hitbox.mjs <gapY> <pipeX> <birdY> <gapSize>");
console.log("");
console.log("Example:");
console.log("  node scripts/check-hitbox.mjs 300 100 300 150");
console.log("");
