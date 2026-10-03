import { GlParticles, GlParticlesConstructorProps } from "./glParticles";
import { Renderer } from "./renderer";
import { getNoiseFn, NoiseFn } from "./noise";
import rnd from "./random";

const FRICTION = 0.02;
const NOISE_STRENGTH = 0.01;
const MIN_VELOCITY = 0.001;
const LOOP_FREQUENCY = 60; // roughly the same as the music

interface SimulationConstructorProps extends GlParticlesConstructorProps {
  numberOfParticles: number;
  noiseResolution: number;
}

/**
 * Class representing a simulation of particles on the surface of a sphere.
 * They move according to their own velocity and a vector field generated with perlin noise.
 *
 * Particle state is stored in flat typed arrays (x, y, z triplets) in Cartesian coordinates.
 * This avoids per-frame object allocations and polar <-> Cartesian conversions, and lets the
 * position buffer be shared with the GPU geometry without copying.
 */
export class Simulation {
  private readonly glParticles: GlParticles;
  private readonly sphereRadius: number;
  private readonly vectorField: NoiseFn;
  readonly count: number;
  // Positions on the sphere surface (Cartesian coordinates)
  readonly positions: Float32Array;
  // Velocities in the local tangent plane (Cartesian coordinates)
  readonly velocities: Float32Array;

  constructor(props: SimulationConstructorProps) {
    this.vectorField = getNoiseFn({ resolution: props.noiseResolution });
    this.sphereRadius = props.sphereRadius;
    this.count = props.numberOfParticles;
    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.glParticles = new GlParticles(props);

    for (let i = 0; i < this.count; i += 1) {
      this.spawnParticle(i);
    }
  }

  init() {
    this.glParticles.init({ simulation: this });
  }

  addToRenderer(renderer: Renderer) {
    this.glParticles.addToRenderer(renderer);
  }

  /**
   * Places the particle at a random position on the sphere (uniform sampling) with a small random velocity.
   */
  private spawnParticle(index: number) {
    const i = index * 3;
    const theta = rnd.random() * 2 * Math.PI;
    const phi = Math.acos(2 * rnd.random() - 1);

    this.positions[i] = this.sphereRadius * Math.sin(phi) * Math.cos(theta);
    this.positions[i + 1] = this.sphereRadius * Math.sin(phi) * Math.sin(theta);
    this.positions[i + 2] = this.sphereRadius * Math.cos(phi);

    this.velocities[i] = rnd.random() * 0.01 - 0.005;
    this.velocities[i + 1] = rnd.random() * 0.001 - 0.0005;
    this.velocities[i + 2] = rnd.random() * 0.001 - 0.0005;
  }

  update({ deltaTime, step }: { deltaTime: number; step: number }) {
    const { positions, velocities, sphereRadius } = this;
    const isKickStep = step % LOOP_FREQUENCY === LOOP_FREQUENCY - 1;
    const isEvenLoop = Math.floor(step / LOOP_FREQUENCY) % 2 === 0;
    const friction = 1 - FRICTION;

    for (let index = 0; index < this.count; index += 1) {
      const i = index * 3;
      let x = positions[i];
      let y = positions[i + 1];
      let z = positions[i + 2];
      let vx = velocities[i];
      let vy = velocities[i + 1];
      let vz = velocities[i + 2];

      let noiseX: number;
      let noiseY: number;
      if (isKickStep) {
        // Once per loop every particle gets a strong push, alternating between two kick patterns
        noiseX = isEvenLoop ? rnd.random() * 100 : rnd.random() * 20 + 50;
        noiseY = isEvenLoop ? rnd.random() * 100 : rnd.random() * 20 + 50;

        const threshold = x + 3 * Math.cos(y / 2);
        if (threshold >= -5) {
          noiseX = -noiseX;
          noiseY = -noiseY;
        }
      } else {
        const angle = this.vectorField(x, y, z);
        noiseX = Math.cos(angle);
        noiseY = Math.sin(angle);
      }

      vx += NOISE_STRENGTH * noiseX * deltaTime;
      vy += NOISE_STRENGTH * noiseY * deltaTime;

      x += vx * deltaTime;
      y += vy * deltaTime;
      z += vz * deltaTime;

      // Normalize to move it back to the sphere surface; the normalized position is also the surface normal
      const invDistance = 1 / Math.sqrt(x * x + y * y + z * z);
      const nx = x * invDistance;
      const ny = y * invDistance;
      const nz = z * invDistance;

      // Subtract the normal component from the current velocity to keep it tangent to the sphere
      const dotProduct = vx * nx + vy * ny + vz * nz;
      vx = (vx - dotProduct * nx) * friction;
      vy = (vy - dotProduct * ny) * friction;
      vz = (vz - dotProduct * nz) * friction;

      if (vx * vx + vy * vy + vz * vz < MIN_VELOCITY * MIN_VELOCITY) {
        this.spawnParticle(index);
        continue;
      }

      positions[i] = nx * sphereRadius;
      positions[i + 1] = ny * sphereRadius;
      positions[i + 2] = nz * sphereRadius;
      velocities[i] = vx;
      velocities[i + 1] = vy;
      velocities[i + 2] = vz;
    }

    this.glParticles.update(this);
  }
}
