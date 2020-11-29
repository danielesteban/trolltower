import {
  BoxBufferGeometry,
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
} from '../core/three.js';

class Sign extends Mesh {
  static setupGeometry() {
    Sign.geometry = new BoxBufferGeometry(4, 1, 0.1);
    const uv = Sign.geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i += 1) {
      if (i >= 0 && i < 8) {
        uv.setX(i, uv.getX(i) / 32);
      }
      if (i >= 8 && i < 14) {
        uv.setY(i, uv.getY(i) / 8);
      }
    }
    Sign.geometry.deleteAttribute('normal');
  }

  static setupMaterial() {
    const renderer = document.createElement('canvas');
    renderer.width = 1024;
    renderer.height = 256;
    const ctx = renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 60px monospace';
    const color = new Color();
    const step = 16;
    for (let y = 0; y < renderer.height; y += step) {
      for (let x = 0; x < renderer.width; x += step) {
        color.setHSL(0, 0.6, 0.1 + Math.random() * 0.1);
        ctx.fillStyle = `#${color.getHexString()}`;
        ctx.fillRect(x, y, step, step);
      }
    }
    ctx.fillStyle = '#f99';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#300';
    ctx.fillText('Under Construction', renderer.width * 0.5, renderer.height * 0.5);
    const texture = new CanvasTexture(renderer);
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    Sign.material = new MeshBasicMaterial({ map: texture });
  }

  constructor() {
    if (!Sign.geometry) {
      Sign.setupGeometry();
    }
    if (!Sign.material) {
      Sign.setupMaterial();
    }
    super(
      Sign.geometry,
      Sign.material
    );
    this.position.set(0, 7, -0.9);
  }
}

export default Sign;
