import AppHeader from "@/components/navigation/AppHeader";

export default function VsPlayerPage() {
  return (
    <main className="app-shell">
      <AppHeader />

      <section className="match-shell">
        <div className="arena-card">
          <h1 className="match-title">Player vs Player</h1>

          <div className="dual-screen">
            <div className="game-panel">
              <div className="panel-header">
                <div>
                  <span className="player-name">Player 1</span>
                  <span className="player-status">Waiting</span>
                </div>
              </div>
              <div className="game-screen" />
            </div>

            <div className="game-panel">
              <div className="panel-header">
                <div>
                  <span className="player-name">Player 2</span>
                  <span className="player-status">Waiting</span>
                </div>
              </div>
              <div className="game-screen" />
            </div>
          </div>

          <div className="match-controls">
            <div className="score-summary">
              <div>
                <span>Player 1</span>
                <strong>0</strong>
              </div>

              <div className="divider" />

              <div>
                <span>Player 2</span>
                <strong>0</strong>
              </div>
            </div>

            <div className="control-buttons">
              <button>Restart</button>
              <button className="secondary">Invite</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
