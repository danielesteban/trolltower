import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
} from '../core/three.js';

class Display extends Mesh {
  static setupGeometry() {
    Display.geometry = new PlaneBufferGeometry(8, 2);
    Display.geometry.deleteAttribute('normal');
  }

  constructor() {
    if (!Display.geometry) {
      Display.setupGeometry();
    }
    const renderer = document.createElement('canvas');
    renderer.width = 512;
    renderer.height = 128;
    super(
      Display.geometry,
      new MeshBasicMaterial({ map: new CanvasTexture(renderer) })
    );
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = '#aaa';
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = '#222';
    const b = 4;
    ctx.fillRect(b, b, renderer.width - (b * 2), renderer.height - (b * 2));
    ctx.fillStyle = '#aaa';
    ctx.fillRect(b * 2, b * 2, renderer.width - (b * 4), renderer.height - (b * 4));
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 32px monospace';
    this.renderer = renderer;
    this.value = 'Loading...';
    this.update();
  }

  dispose() {
    const { material } = this;
    material.map.dispose();
    material.dispose();
  }

  set(value) {
    if (this.value === value) {
      return;
    }
    this.value = value;
    this.update();
  }

  update() {
    const { material, renderer, value } = this;
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = '#aaa';
    ctx.fillRect(10, 10, renderer.width - 20, renderer.height - 20);
    ctx.fillStyle = '#000';
    ctx.fillText(value, renderer.width * 0.5, renderer.height * 0.5);
    material.map.needsUpdate = true;
  }
}

export default Display;
