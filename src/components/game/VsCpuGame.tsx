"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGame,
  createRandomSeed,
  getAiState,
  getVisiblePipes,
  stepGame,
  type GameRuntime,
} from "@/game/core/flappyEngine";
import { GAME_CONFIG, type GameAction } from "@/game/core/config";
import { DqnAgent } from "@/game/ai/dqnAgent";
import { loadCpuModel } from "@/game/ai/loadCpuModel";

type Winner = "Player" | "CPU" | "Draw" | null;

type SessionStats = {
  gamesPlayed: number;
  playerWins: number;
  cpuWins: number;
};

type Snapshot = {
  started: boolean;
  recordedResult: boolean;
  userScore: number;
  cpuScore: number;
  userDone: boolean;
  cpuDone: boolean;
  winner: Winner;
  userGame: GameRuntime;
  cpuGame: GameRuntime;
  stats: SessionStats;
};

const INITIAL_SEED = "first-round";
const SESSION_STATS_KEY = "flappy-nn-session-stats-v1";

function createEmptyStats(): SessionStats {
  return {
    gamesPlayed: 0,
    playerWins: 0,
    cpuWins: 0,
  };
}

function readSessionStats(): SessionStats {
  if (typeof window === "undefined") {
    return createEmptyStats();
  }

  const raw = window.sessionStorage.getItem(SESSION_STATS_KEY);

  if (!raw) {
    return createEmptyStats();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionStats>;

    return {
      gamesPlayed: Number(parsed.gamesPlayed ?? 0),
      playerWins: Number(parsed.playerWins ?? 0),
      cpuWins: Number(parsed.cpuWins ?? 0),
    };
  } catch {
    window.sessionStorage.removeItem(SESSION_STATS_KEY);
    return createEmptyStats();
  }
}

function saveSessionStats(stats: SessionStats) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SESSION_STATS_KEY, JSON.stringify(stats));
}

function createMatch(
  seed = INITIAL_SEED,
  stats = createEmptyStats(),
): Snapshot {
  const userGame = createGame(seed);
  const cpuGame = createGame(seed);

  return {
    started: false,
    recordedResult: false,
    userScore: 0,
    cpuScore: 0,
    userDone: false,
    cpuDone: false,
    winner: null,
    userGame,
    cpuGame,
    stats,
  };
}

function recordResult(match: Snapshot) {
  if (match.recordedResult || !match.winner) {
    return;
  }

  match.recordedResult = true;
  match.stats.gamesPlayed += 1;

  if (match.winner === "Player") {
    match.stats.playerWins += 1;
  }

  if (match.winner === "CPU") {
    match.stats.cpuWins += 1;
  }

  saveSessionStats(match.stats);
}

export default function VsCpuGame() {
  const agentRef = useRef<DqnAgent | null>(null);

  if (agentRef.current === null) {
    agentRef.current = new DqnAgent();
  }

  const matchRef = useRef<Snapshot>(createMatch());
  const userFlapRef = useRef(false);
  const lastGameTapRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  const [snapshot, setSnapshot] = useState<Snapshot>(() => matchRef.current);

  useEffect(() => {
    const savedStats = readSessionStats();
    const match = matchRef.current;

    match.stats = savedStats;

    setSnapshot({
      ...match,
      stats: { ...savedStats },
    });
  }, []);

  useEffect(() => {
    const currentAgent = agentRef.current;

    if (currentAgent === null) {
      return;
    }

    const agent: DqnAgent = currentAgent;
    let cancelled = false;

    async function loadOfficialModel() {
      const result = await loadCpuModel(agent);

      if (cancelled) {
        return;
      }

      if (!result.loaded) {
        console.warn(result.reason);
      }
    }

    loadOfficialModel();

    return () => {
      cancelled = true;
    };
  }, []);

  const restart = useCallback(() => {
    const stats = matchRef.current.stats;

    matchRef.current = createMatch(createRandomSeed(), stats);
    userFlapRef.current = false;

    setSnapshot({
      ...matchRef.current,
      stats: { ...stats },
    });
  }, []);

  const requestUserFlap = useCallback(() => {
    const match = matchRef.current;

    if (match.winner) {
      return;
    }

    match.started = true;
    userFlapRef.current = true;
    setSnapshot({ ...match });
  }, []);

  const handleGameTap = useCallback(() => {
    const now = Date.now();

    // Prevent double-trigger from touch + pointer events firing together.
    if (now - lastGameTapRef.current < 70) {
      return;
    }

    lastGameTapRef.current = now;
    requestUserFlap();
  }, [requestUserFlap]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        requestUserFlap();
      }

      if (event.code === "KeyR") {
        restart();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [requestUserFlap, restart]);

  useEffect(() => {
    // Fixed simulation speed independent of browser FPS / laptop power mode.
    // 90 Hz keeps the old fast-feeling gameplay without depending on high-refresh rendering.
    const SIMULATION_HZ = 112;
    const STEP_MS = 1000 / SIMULATION_HZ;
    const MAX_FRAME_DELTA_MS = 250;
    const MAX_STEPS_PER_FRAME = 12;

    let lastTime = performance.now();
    let accumulator = 0;

    const frame = (now: number) => {
      const elapsed = Math.min(now - lastTime, MAX_FRAME_DELTA_MS);
      lastTime = now;

      const match = matchRef.current;
      const agent = agentRef.current;

      if (!match.started || match.winner || !agent) {
        accumulator = 0;
        animationRef.current = requestAnimationFrame(frame);
        return;
      }

      accumulator += elapsed;

      let didStep = false;
      let stepsThisFrame = 0;

      while (
        accumulator >= STEP_MS &&
        stepsThisFrame < MAX_STEPS_PER_FRAME &&
        match.started &&
        !match.winner
      ) {
        const cpuState = getAiState(match.cpuGame);

        const userAction: GameAction = userFlapRef.current ? 1 : 0;
        userFlapRef.current = false;

        // CPU uses only the loaded official trained model.
        // No epsilon, no exploration, no browser training, no localStorage.
        const cpuDecision = agent.chooseAction(cpuState, false);

        stepGame(match.userGame, userAction);
        stepGame(match.cpuGame, cpuDecision.action);

        match.userScore = match.userGame.state.score;
        match.cpuScore = match.cpuGame.state.score;
        match.userDone = match.userGame.state.done;
        match.cpuDone = match.cpuGame.state.done;

        if (match.userDone && match.cpuDone) {
          match.winner = "Draw";
        } else if (match.userDone) {
          match.winner = "CPU";
        } else if (match.cpuDone) {
          match.winner = "Player";
        }

        if (match.winner) {
          recordResult(match);
        }

        didStep = true;
        stepsThisFrame += 1;
        accumulator -= STEP_MS;
      }

      if (stepsThisFrame >= MAX_STEPS_PER_FRAME) {
        accumulator = 0;
      }

      if (didStep) {
        setSnapshot({
          ...match,
          stats: { ...match.stats },
        });
      }

      animationRef.current = requestAnimationFrame(frame);
    };

    animationRef.current = requestAnimationFrame(frame);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <section
      className="match-shell"
      onPointerDownCapture={(event) => {
        const target = event.target as HTMLElement;

        if (target.closest("a, button, .app-header")) {
          return;
        }

        event.preventDefault();
        handleGameTap();
      }}
      onTouchStartCapture={(event) => {
        const target = event.target as HTMLElement;

        if (target.closest("a, button, .app-header")) {
          return;
        }

        event.preventDefault();
        handleGameTap();
      }}
    >
      <div className="arena-card">
        <div className="match-heading-row">
          <h1 className="match-title">
            {snapshot.winner
              ? snapshot.winner === "Draw"
                ? "Draw"
                : `${snapshot.winner} wins`
              : snapshot.started
                ? "Player vs CPU"
                : "Press Space or tap to start"}
          </h1>

          <SessionStatsBar stats={snapshot.stats} />
        </div>

        <p className="match-help">Space / tap to flap · R to restart</p>

        <div className="dual-screen">
          <GamePanel
            name="Player"
            status={
              snapshot.userDone
                ? "Crashed"
                : snapshot.started
                  ? "Playing"
                  : "Ready"
            }
            game={snapshot.userGame}
            birdClass="user-bird"
            onPointerDown={requestUserFlap}
          />

          <GamePanel
            name="CPU"
            status={
              snapshot.cpuDone
                ? "Crashed"
                : snapshot.started
                  ? "Playing"
                  : "Waiting"
            }
            game={snapshot.cpuGame}
            birdClass="cpu-bird"
            onPointerDown={requestUserFlap}
          />
        </div>

        <div className="match-controls centered">
          <div className="score-summary">
            <div>
              <span>Player</span>
              <strong>{snapshot.userScore}</strong>
            </div>

            <div className="divider" />

            <div>
              <span>CPU</span>
              <strong>{snapshot.cpuScore}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SessionStatsBar({ stats }: { stats: SessionStats }) {
  return (
    <div className="top-session-stats">
      <div>
        <span>Games</span>
        <strong>{stats.gamesPlayed}</strong>
      </div>

      <div>
        <span>Player</span>
        <strong>{stats.playerWins}</strong>
      </div>

      <div>
        <span>CPU</span>
        <strong>{stats.cpuWins}</strong>
      </div>
    </div>
  );
}

function GamePanel({
  name,
  status,
  game,
  birdClass,
  onPointerDown,
}: {
  name: string;
  status: string;
  game: GameRuntime;
  birdClass: string;
  onPointerDown?: () => void;
}) {
  const visiblePipes = getVisiblePipes(game);
  const lastTouchTimeRef = useRef(0);

  const birdLeftPercent = (GAME_CONFIG.birdX / GAME_CONFIG.width) * 100;
  const birdTopPercent = (game.state.birdY / GAME_CONFIG.height) * 100;

  function handlePointerStart(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();

    // Touch devices may also fire touchstart. Avoid double flap.
    if (Date.now() - lastTouchTimeRef.current < 120) {
      return;
    }

    onPointerDown?.();
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    event.preventDefault();
    lastTouchTimeRef.current = Date.now();
    onPointerDown?.();
  }

  return (
    <div className="game-panel">
      <div className="panel-header">
        <div>
          <span className="player-name">{name}</span>
          <span className="player-status">{status}</span>
        </div>
      </div>

      <div
        className="game-screen"
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerStart}
        onTouchStart={handleTouchStart}
      >
        <div className="cloud cloud-one" />
        <div className="cloud cloud-two" />

        {visiblePipes.map((pipe) => {
          const left = (pipe.x / GAME_CONFIG.width) * 100;
          const width = (GAME_CONFIG.pipeWidth / GAME_CONFIG.width) * 100;
          const topHeight = (pipe.gapTop / GAME_CONFIG.height) * 100;

          const bottomHeight =
            ((GAME_CONFIG.height -
              GAME_CONFIG.groundHeight -
              pipe.gapBottom) /
              GAME_CONFIG.height) *
              100 +
            3.0;

          const groundHeightPercent =
            (GAME_CONFIG.groundHeight / GAME_CONFIG.height) * 100;

          const bottomPipeExtensionPercent = 3.0;
          const visualBottomPercent = Math.max(
            0,
            groundHeightPercent - bottomPipeExtensionPercent,
          );

          return (
            <div key={pipe.id}>
              <div
                className="pipe pipe-top"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  height: `${topHeight}%`,
                }}
              />

              <div
                className="pipe pipe-bottom"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  height: `${bottomHeight}%`,
                  bottom: `${visualBottomPercent}%`,
                }}
              />
            </div>
          );
        })}

        <div
          className={`bird ${birdClass}`}
          style={{
            left: `${birdLeftPercent}%`,
            top: `${birdTopPercent}%`,
          }}
        >
          <div className="bird-eye" />
          <div className="bird-beak" />
          <div className="bird-wing" />
        </div>

        <div className="ground">
          <div className="ground-line" />
          <div className="ground-dot dot-one" />
          <div className="ground-dot dot-two" />
        </div>
      </div>
    </div>
  );
}
