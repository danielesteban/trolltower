import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
} from '../core/three.js';

class Title extends Mesh {
  static setupGeometry() {
    Title.geometry = new PlaneBufferGeometry(6, 4);
    Title.geometry.deleteAttribute('normal');
  }

  static setupMaterial() {
    const renderer = document.createElement('canvas');
    renderer.width = 900;
    renderer.height = 600;
    const ctx = renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = '700 100px monospace';
    ctx.fillText('TROLLTOWER', renderer.width * 0.5, renderer.height * 0.25);
    ctx.font = '700 50px monospace';
    ctx.fillText('A WEBXR MULTIPLAYER GAME', renderer.width * 0.5, renderer.height * 0.53);
    ctx.fillStyle = '#666';
    ctx.font = '700 25px monospace';
    ctx.fillText('v0.0.1 - dani@gatunes © 2020', renderer.width * 0.5, renderer.height * 0.84);
    ctx.fillText('textures by greenpixel', renderer.width * 0.5, renderer.height * 0.91);
    const texture = new CanvasTexture(renderer);
    Title.material = new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide });
  }

  constructor() {
    if (!Title.geometry) {
      Title.setupGeometry();
    }
    if (!Title.material) {
      Title.setupMaterial();
    }
    super(
      Title.geometry,
      Title.material
    );
    this.position.set(0, 3, -6.75);
    this.rotation.x = Math.PI * -0.1;
  }
}

export default Title;
