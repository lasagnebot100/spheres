import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

interface Renderable {
  scene: THREE.Scene;
  camera: THREE.Camera;
}

const createOrbitControls = (camera: THREE.Camera, renderer: THREE.Renderer) => {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = false;
  return controls;
};

/**
 * The Renderer class sets up and manages the rendering of scenes using WebGL.
 */
export class Renderer {
  private readonly renderer: THREE.WebGLRenderer;
  private renderables: Renderable[] = [];
  private controls?: OrbitControls;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  }

  init() {
    this.renderer.autoClearColor = false;

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener("resize", () => this.resize());
  }

  /**
   * Adapts the canvas and all perspective cameras to the current window size.
   */
  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);

    for (const { camera } of this.renderables) {
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    }
  }

  /**
   * Downloads the current canvas content as PNG.
   */
  saveScreenshot(fileName = "spheres.png") {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = this.renderer.domElement.toDataURL("image/png");
    link.click();
  }

  add(renderable: Renderable, { addControls = false } = {}) {
    this.renderables.push(renderable);

    if (addControls) {
      this.controls = createOrbitControls(renderable.camera, this.renderer);
      this.controls.target = new THREE.Vector3(0, 0, -40);
      this.controls.update();
    }

    return this;
  }

  render() {
    this.controls?.update();

    for (const renderable of this.renderables) {
      this.renderer.render(renderable.scene, renderable.camera);
    }
  }
}
