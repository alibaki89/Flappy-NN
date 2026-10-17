"use client";

import { useEffect, useRef, useState } from "react";

export type InitialBall = {
  xPercent: number;
  yPercent: number;
  angle: number;
  color: string;
};

type Ball = InitialBall & {
  vxPx: number;
  vyPx: number;
};

const BALL_SIZE_PX = 16;
const BALL_RADIUS_PX = BALL_SIZE_PX / 2;
const BALL_SPEED_PX = 0.18;

function makeBall(initial: InitialBall): Ball {
  return {
    ...initial,
    vxPx: Math.cos(initial.angle) * BALL_SPEED_PX,
    vyPx: Math.sin(initial.angle) * BALL_SPEED_PX,
  };
}

function normalizeVelocity(ball: Ball) {
  const speed = Math.hypot(ball.vxPx, ball.vyPx);

  if (speed === 0) {
    ball.vxPx = BALL_SPEED_PX;
    ball.vyPx = 0;
    return;
  }

  ball.vxPx = (ball.vxPx / speed) * BALL_SPEED_PX;
  ball.vyPx = (ball.vyPx / speed) * BALL_SPEED_PX;
}

function resolveCollision(a: Ball, b: Ball, width: number, height: number) {
  const ax = (a.xPercent / 100) * width;
  const ay = (a.yPercent / 100) * height;
  const bx = (b.xPercent / 100) * width;
  const by = (b.yPercent / 100) * height;

  const dx = bx - ax;
  const dy = by - ay;
  const distanceSquared = dx * dx + dy * dy;
  const minDistance = BALL_RADIUS_PX * 2;

  if (distanceSquared === 0 || distanceSquared > minDistance * minDistance) {
    return;
  }

  const distance = Math.sqrt(distanceSquared);
  const nx = dx / distance;
  const ny = dy / distance;

  const relativeVx = a.vxPx - b.vxPx;
  const relativeVy = a.vyPx - b.vyPx;
  const velocityAlongNormal = relativeVx * nx + relativeVy * ny;

  if (velocityAlongNormal < 0) {
    return;
  }

  a.vxPx -= velocityAlongNormal * nx;
  a.vyPx -= velocityAlongNormal * ny;
  b.vxPx += velocityAlongNormal * nx;
  b.vyPx += velocityAlongNormal * ny;

  const overlap = minDistance - distance;
  const correction = overlap / 2 + 0.1;

  const correctionXPercent = ((nx * correction) / width) * 100;
  const correctionYPercent = ((ny * correction) / height) * 100;

  a.xPercent -= correctionXPercent;
  a.yPercent -= correctionYPercent;
  b.xPercent += correctionXPercent;
  b.yPercent += correctionYPercent;

  normalizeVelocity(a);
  normalizeVelocity(b);
}

export default function HtmlPhysicsBalls({
  initialBalls,
}: {
  initialBalls: InitialBall[];
}) {
  const frameRef = useRef<number | null>(null);

  // Important:
  // This is initialized directly from props, so the balls are present in the
  // first rendered HTML. They do NOT wait for useEffect to appear.
  const [balls, setBalls] = useState<Ball[]>(() =>
    initialBalls.map((ball) => makeBall(ball)),
  );

  useEffect(() => {
    function tick() {
      setBalls((current) => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        const next = current.map((ball) => {
          const moved = { ...ball };

          moved.xPercent += (moved.vxPx / width) * 100;
          moved.yPercent += (moved.vyPx / height) * 100;

          const radiusXPercent = (BALL_RADIUS_PX / width) * 100;
          const radiusYPercent = (BALL_RADIUS_PX / height) * 100;

          if (moved.xPercent <= radiusXPercent) {
            moved.xPercent = radiusXPercent;
            moved.vxPx = Math.abs(moved.vxPx);
          }

          if (moved.xPercent >= 100 - radiusXPercent) {
            moved.xPercent = 100 - radiusXPercent;
            moved.vxPx = -Math.abs(moved.vxPx);
          }

          if (moved.yPercent <= radiusYPercent) {
            moved.yPercent = radiusYPercent;
            moved.vyPx = Math.abs(moved.vyPx);
          }

          if (moved.yPercent >= 100 - radiusYPercent) {
            moved.yPercent = 100 - radiusYPercent;
            moved.vyPx = -Math.abs(moved.vyPx);
          }

          normalizeVelocity(moved);
          return moved;
        });

        for (let i = 0; i < next.length; i += 1) {
          for (let j = i + 1; j < next.length; j += 1) {
            resolveCollision(next[i], next[j], width, height);
          }
        }

        return next;
      });

      frameRef.current = window.requestAnimationFrame(tick);
    }

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div className="html-balls-background" aria-hidden="true">
      {balls.map((ball, index) => (
        <span
          className="html-ball"
          key={index}
          style={{
            left: `${ball.xPercent}vw`,
            top: `${ball.yPercent}vh`,
            backgroundColor: ball.color,
          }}
        />
      ))}
    </div>
  );
}
