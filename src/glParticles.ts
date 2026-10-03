import * as THREE from "three";
import { Simulation } from "./simulation";
import { createColorLUT, getGradient, Gradient } from "./color";
import { Renderer } from "./renderer";

const createCamera = () => {
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
  camera.up = new THREE.Vector3(0, 0, 1);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  camera.translateX(50);
  camera.translateY(50);
  camera.translateZ(50);

  return camera;
};

const createScene = ({ backgroundColor }: { backgroundColor: THREE.ColorRepresentation }) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);
  return scene;
};

export interface GlParticlesConstructorProps {
  sphereRadius: number;
  particleSize: number;
  backgroundColor: THREE.ColorRepresentation;
  gradient: Gradient;
}

// Velocity magnitude that maps to the end of the gradient
const MAX_VELOCITY = 0.4;
const LUT_SIZE = 4096;

const bGradient = getGradient("ice");

/**
 * The GlParticles class is responsible for representing and managing a
 * collection of particles in a 3D space, rendered using WebGL.
 */
export class GlParticles {
  private readonly particleSize: number;
  private readonly colorLUT: Float32Array;
  private readonly bColorLUT: Float32Array;
  private geometry = new THREE.BufferGeometry();
  private material: THREE.PointsMaterial;
  private sprite = new THREE.TextureLoader().load("textures/disc.png");
  private points: THREE.Points;
  camera: THREE.Camera;
  scene: THREE.Scene;

  constructor({ backgroundColor, gradient, particleSize }: GlParticlesConstructorProps) {
    this.camera = createCamera();
    this.scene = createScene({ backgroundColor });
    this.colorLUT = createColorLUT(gradient, LUT_SIZE);
    this.bColorLUT = createColorLUT(bGradient, LUT_SIZE);
    this.particleSize = particleSize;
  }

  init({ simulation }: { simulation: Simulation }) {
    // The simulation's position buffer is shared with the geometry, so no copy is needed on update
    const positionAttribute = new THREE.BufferAttribute(simulation.positions, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    const colorAttribute = new THREE.BufferAttribute(new Float32Array(simulation.count * 3), 3);
    colorAttribute.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute("position", positionAttribute);
    this.geometry.setAttribute("color", colorAttribute);

    this.material = new THREE.PointsMaterial({
      size: this.particleSize,
      vertexColors: true, // Enable vertex colors
      map: this.sprite,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    // Particles always cover the whole sphere, so there is no need to compute bounding volumes for culling
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  addToRenderer(renderer: Renderer) {
    renderer.add({ scene: this.scene, camera: this.camera }, { addControls: true });
  }

  update(simulation: Simulation) {
    const { positions, velocities } = simulation;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const { colorLUT, bColorLUT } = this;
    const maxLutIndex = LUT_SIZE - 1;

    for (let index = 0; index < simulation.count; index += 1) {
      const i = index * 3;
      const vx = velocities[i];
      const vy = velocities[i + 1];
      const vz = velocities[i + 2];

      // Map the speed to a gradient position (clamped to [0, 1]) and interpolate between neighbouring LUT entries
      const lutPosition = Math.min(Math.sqrt(vx * vx + vy * vy + vz * vz) / MAX_VELOCITY, 1) * maxLutIndex;
      const lutIndex = Math.min(Math.floor(lutPosition), maxLutIndex - 1);
      const fraction = lutPosition - lutIndex;
      const l0 = lutIndex * 3;
      const l1 = l0 + 3;

      // Blend between both gradients along a wavy band across the sphere
      const threshold = positions[i] + 3 * Math.cos(positions[i + 1] / 2);
      // Weight of the second gradient: 0 below -10, 1 from 0 upwards
      const mix = threshold < -10 ? 0 : threshold < 0 ? (threshold + 10) / 10 : 1;

      for (let c = 0; c < 3; c += 1) {
        const a = colorLUT[l0 + c] + (colorLUT[l1 + c] - colorLUT[l0 + c]) * fraction;
        const b = bColorLUT[l0 + c] + (bColorLUT[l1 + c] - bColorLUT[l0 + c]) * fraction;
        // Same as chroma.mix in its default "lrgb" mode
        colors[i + c] = mix === 0 ? a : mix === 1 ? b : Math.sqrt(a * a * (1 - mix) + b * b * mix);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
