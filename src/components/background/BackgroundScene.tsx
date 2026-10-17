import HtmlPhysicsBalls, { type InitialBall } from "./HtmlPhysicsBalls";

const HEX_PARTS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
];

const BALL_COUNT = 82;

function randomIndex(max: number): number {
  return Math.floor(Math.random() * max);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function buildRandomHexColor(): string {
  let color = "#";

  for (let i = 0; i < 6; i += 1) {
    color += HEX_PARTS[randomIndex(HEX_PARTS.length)];
  }

  return color;
}

function createInitialBalls(): InitialBall[] {
  return Array.from({ length: BALL_COUNT }, () => ({
    xPercent: randomBetween(2, 98),
    yPercent: randomBetween(2, 96),
    angle: randomBetween(0, Math.PI * 2),
    color: buildRandomHexColor(),
  }));
}

export default function BackgroundScene() {
  const initialBalls = createInitialBalls();

  return <HtmlPhysicsBalls initialBalls={initialBalls} />;
}
