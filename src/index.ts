import { Simulation } from "./simulation";
import { Fade } from "./fade";
import { Renderer } from "./renderer";
import { getGradient } from "./color";
import rnd from "./random";

const DEFAULT_PALETTE = "fire";
const DEFAULT_PARTICLES = 100000;
const MAX_PARTICLES = 1000000;

/**
 * Writes the current seed to the URL so the render can be reproduced or shared.
 * Some embedding contexts (e.g. sandboxed frames) don't allow this, which is fine to ignore.
 */
const writeSeedToUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    params.set("seed", rnd.getSeed());
    window.history.replaceState(null, "", `?${params}`);
  } catch {
    // The render still works, it just can't be shared via URL
  }
};

/**
 * Reads the render settings from the URL, e.g. `?seed=1234&palette=ice&particles=50000`.
 * The seed is written back to the URL so the current render can be reproduced or shared.
 */
const readSettings = () => {
  const params = new URLSearchParams(window.location.search);

  const seed = params.get("seed");
  if (seed) {
    rnd.setSeed(seed);
  } else {
    writeSeedToUrl();
  }

  const palette = params.get("palette") ?? DEFAULT_PALETTE;
  const gradient = getGradient(palette) ?? getGradient(DEFAULT_PALETTE);

  const particles = Number.parseInt(params.get("particles") ?? "", 10);
  const numberOfParticles = particles > 0 ? Math.min(particles, MAX_PARTICLES) : DEFAULT_PARTICLES;

  return { gradient, numberOfParticles };
};

const main = () => {
  const { gradient, numberOfParticles } = readSettings();

  const renderer = new Renderer();
  const simulation = new Simulation({
    numberOfParticles,
    sphereRadius: 50,
    backgroundColor: 0x000,
    noiseResolution: 0.05,
    particleSize: 0.01,
    gradient,
  });
  const fade = new Fade({ alpha: 0.05 });

  renderer.init();
  simulation.init();

  simulation.addToRenderer(renderer);
  fade.addToRenderer(renderer);

  let step = 0;
  let paused = false;
  function animate() {
    requestAnimationFrame(animate);

    if (paused) return;

    simulation.update({ deltaTime: 0.5, step });
    renderer.render();

    step += 1;
  }
  requestAnimationFrame(animate);

  // Space: pause/resume, S: save screenshot, N: restart with a new seed
  window.addEventListener("keydown", (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;

    switch (event.key.toLowerCase()) {
      case " ":
        event.preventDefault();
        paused = !paused;
        break;
      case "s":
        renderer.saveScreenshot(`spheres-${rnd.getSeed()}-${step}.png`);
        break;
      case "n":
        // Restart in place instead of reloading, so it also works where the page can't navigate
        rnd.newSeed();
        writeSeedToUrl();
        simulation.reset();
        step = 0;
        paused = false;
        break;
    }
  });
};

document.addEventListener("DOMContentLoaded", main);
