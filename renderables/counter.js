import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
} from '../core/three.js';

class Counter extends Mesh {
  static setupGeometry() {
    Counter.geometry = new PlaneBufferGeometry(0.075, 0.05);
    Counter.geometry.deleteAttribute('normal');
  }

  constructor({
    handedness,
    icon,
    value = 0,
  }) {
    if (!Counter.geometry) {
      Counter.setupGeometry();
    }
    const renderer = document.createElement('canvas');
    renderer.width = 96;
    renderer.height = 64;
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    super(
      Counter.geometry,
      new MeshBasicMaterial({ map: texture, side: DoubleSide, transparent: true })
    );
    const ctx = renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 20px monospace';
    this.backgrounds = ['255, 0, 0', '0, 0, 255'].map((color) => {
      const background = ctx.createLinearGradient(0, 0, renderer.width, renderer.height);
      if (handedness === 'left') {
        background.addColorStop(0, `rgba(${color}, 0)`);
        background.addColorStop(1, `rgba(${color}, 0.1)`);
      } else {
        background.addColorStop(0, `rgba(${color}, 0.1)`);
        background.addColorStop(1, `rgba(${color}, 0)`);
      }
      return background;
    });
    this.foregrounds = ['#f66', '#99f'];
    switch (icon) {
      default:
      case 'circle':
        this.icon = new Path2D();
        this.icon.arc(renderer.width * 0.5 - 20, renderer.height * 0.5, 12, 0, Math.PI * 2);
        break;
    }
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
      backgrounds,
      foregrounds,
      icon,
      material,
      renderer,
      value,
    } = this;
    const color = value === 0 ? 0 : 1;
    const ctx = renderer.getContext('2d');
    ctx.clearRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = backgrounds[color];
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = foregrounds[color];
    ctx.fill(icon);
    ctx.fillText(`${value < 10 ? '0' : ''}${value}`, renderer.width * 0.5 + 20, renderer.height * 0.5 + 1);
    material.map.needsUpdate = true;
  }
}

export default Counter;
