import VsCpuGame from "@/components/game/VsCpuGame";

export default function VsCpuPage() {
  return (
    <>
      <main className="app-shell desktop-demo-shell">
        <VsCpuGame />
      </main>

      <main className="mobile-demo-warning">
        <section>
          <p className="about-kicker">ABProjects</p>
          <h1>Flappy NN</h1>
          <p>
            The Vs CPU demo is designed for PC and laptop screens. Please use a
            desktop or laptop device to test the playable demo.
          </p>
          <p>
            The About page is still available on mobile if you want to read about
            the project, neural network, training process, and implementation.
          </p>
        </section>
      </main>
    </>
  );
}
