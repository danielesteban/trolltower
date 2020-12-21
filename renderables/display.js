import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
} from '../core/three.js';

class Display extends Mesh {
  static setupGeometry() {
    Display.geometry = new PlaneBufferGeometry(8, 2);
    Display.geometry.deleteAttribute('normal');
  }

  constructor({
    background = '#333',
    fontSize = 32,
    foreground = '#eee',
    value = 'Loading...',
  }) {
    if (!Display.geometry) {
      Display.setupGeometry();
    }
    const renderer = document.createElement('canvas');
    renderer.width = 512;
    renderer.height = 128;
    const texture = new CanvasTexture(renderer);
    texture.encoding = sRGBEncoding;
    super(
      Display.geometry,
      new MeshBasicMaterial({ map: texture })
    );
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = foreground;
    const b = 4;
    ctx.fillRect(b, b, renderer.width - (b * 2), renderer.height - (b * 2));
    ctx.fillStyle = background;
    ctx.fillRect(b * 2, b * 2, renderer.width - (b * 4), renderer.height - (b * 4));
    ctx.fillStyle = foreground;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${fontSize}px monospace`;
    this.colors = { background, foreground };
    this.renderer = renderer;
    this.value = value;
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
    const {
      colors: { background, foreground },
      material,
      renderer,
      value,
    } = this;
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = background;
    ctx.fillRect(10, 10, renderer.width - 20, renderer.height - 20);
    ctx.fillStyle = foreground;
    ctx.fillText(value, renderer.width * 0.5, renderer.height * 0.5);
    material.map.needsUpdate = true;
  }
}

export default Display;
