"use client";

import { useRef } from "react";

type AboutSlide = {
  kicker: string;
  title: string;
  body: string[];
  formula?: string;
  code?: string;
  imageSrc?: string;
  downloadHref?: string;
};

const slides: AboutSlide[] = [
  {
    kicker: "Visual",
    title: "Flappy NN",
    imageSrc: "/about/about-first-slide.jpg",
    body: [],
  },
  {
    kicker: "Project",
    title: "Flappy NN",
    body: [
      "Flappy NN is a browser-based Flappy-style game where a human player competes against a neural network trained through reinforcement learning.",
      "Both the player and the CPU face the same seeded terrain: the same pipe positions, gap centers, gap sizes, speed, gravity, and collision rules.",
      "The project includes the game engine, deterministic terrain, neural-network model, terminal training scripts, evaluation tools, saved model export, and website integration.",
    ],
  },
  {
    kicker: "State",
    title: "What the AI sees",
    body: [
      "The model does not see pixels. Each frame is converted into a compact numerical state vector.",
      "The state contains bird height, bird velocity, distance to the next pipe, next gap center, vertical difference from the gap, pipe speed, gap size, time to pipe, and previous action.",
      "This turns the problem into a control task: the model learns when to flap and when to wait.",
    ],
  },
  {
    kicker: "Model",
    title: "Neural network shape",
    formula: "9 → 64 → 64 → 2",
    body: [
      "The 9 inputs are the game-state values.",
      "The two hidden layers learn patterns such as falling too fast, being below the gap, or approaching a pipe.",
      "The 2 outputs are Q(wait) and Q(flap). During play, the CPU chooses the action with the larger Q-value.",
    ],
  },
  {
    kicker: "Math",
    title: "Deep Q-Learning",
    code: "Q(s, a) ← reward + γ · max Q(nextState, nextAction)",
    body: [
      "Deep Q-Learning trains the model to estimate the future value of each action.",
      "The gamma value γ controls how much the model cares about future reward.",
      "This lets the CPU learn that a flap can matter not only now, but also because it prevents a crash later.",
    ],
  },
  {
    kicker: "Reward",
    title: "How learning feedback works",
    body: [
      "After each action, the model receives feedback from the environment.",
      "It gets positive reward for staying alive, moving closer to the pipe gap, and passing pipes.",
      "It gets negative reward for crashing, and a small penalty for unnecessary flaps so it does not spam the flap action.",
      "The reward does not directly tell the model what action to choose. It only tells the model whether the result was good or bad.",
    ],
  },
  {
    kicker: "Training",
    title: "Replay memory and training loop",
    code: "state, action, reward, nextState, done",
    body: [
      "Gameplay experiences are stored as transitions in replay memory.",
      "Instead of training only from the newest frame, the model trains from batches of past experiences.",
      "This makes learning more stable and helps the network remember rare but important events, such as successfully passing a pipe.",
    ],
  },
  {
    kicker: "Evaluation",
    title: "Testing the trained model",
    code: "action = argmax(Q(wait), Q(flap))",
    body: [
      "Evaluation is done with epsilon off, so there is no random exploration.",
      "There is also no training during evaluation. The model only uses the learned Q-values.",
      "The trained model was tested on random unseen terrains with variable pipe gaps and reached high scores consistently without heuristics or browser-time learning.",
    ],
  },
  {
    kicker: "Implementation",
    title: "Code architecture",
    code: "game engine → state vector → DQN model → action → game step",
    body: [
      "The game engine handles physics, pipe generation, collision, scoring, and deterministic terrain.",
      "The AI module contains the DQN agent, neural network, replay memory, model loading, and JSON import/export.",
      "Terminal scripts handle training, evaluation, random-terrain testing, and crash inspection.",
      "The website loads the final saved model and uses it as the CPU opponent.",
    ],
  },
  {
    kicker: "Weights",
    title: "The trained numbers",
    code: "Total = 4,930 trainable numbers",
    downloadHref: "/models/flappy-nn-weights.txt",
    body: [
      "The CPU model is stored as weights and biases. These numbers are the learned brain of the bot.",
      "w1: 9 × 64 = 576 weights",
      "b1: 64 = 64 biases",
      "w2: 64 × 64 = 4096 weights",
      "b2: 64 = 64 biases",
      "w3: 64 × 2 = 128 weights",
      "b3: 2 = 2 biases",
      "The file is public on purpose. It contains only the trained model weights, not secrets or private data.",
    ],
  },
];

export default function AboutSlideshow() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  function scrollBySlide(direction: -1 | 1) {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      left: direction * scroller.clientWidth,
      behavior: "smooth",
    });
  }

  return (
    <main className="about-slideshow-page">
      <section className="about-slideshow-shell">
        <div className="about-slideshow-top">
          <div>
            <p className="about-kicker">ABProjects</p>
            <h1>Flappy NN</h1>
          </div>

          <div className="about-slide-controls">
            <button type="button" onClick={() => scrollBySlide(-1)}>
              Prev
            </button>
            <button type="button" onClick={() => scrollBySlide(1)}>
              Next
            </button>
          </div>
        </div>

        <div ref={scrollerRef} className="about-slide-scroller">
          {slides.map((slide, index) => (
            <article className="about-slide" key={`${slide.kicker}-${slide.title}`}>
              <div className="about-slide-number">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(slides.length).padStart(2, "0")}
              </div>

              <p className="about-kicker">{slide.kicker}</p>
              <h2>{slide.title}</h2>

              {slide.imageSrc ? (
                <img
                  className="about-slide-image"
                  src={slide.imageSrc}
                  alt="Flappy NN project visual"
                />
              ) : null}

              {slide.formula ? (
                <div className="about-formula">{slide.formula}</div>
              ) : null}

              {slide.code ? <div className="about-code">{slide.code}</div> : null}

              <div className="about-slide-body">
                {slide.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              {slide.downloadHref ? (
                <a
                  className="about-download-link"
                  href={slide.downloadHref}
                  download
                >
                  Download weights .txt
                </a>
              ) : null}
            </article>
          ))}
        </div>

        <p className="about-slide-hint">
          Scroll sideways or use Prev / Next to move through the project.
        </p>
      </section>
    </main>
  );
}
