import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
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
    ctx.fillText('A MULTIPLAYER CLIMBING GAME', renderer.width * 0.5, renderer.height * 0.53);
    ctx.fillStyle = '#999';
    ctx.font = '700 25px monospace';
    ctx.fillText('v0.2.3 - dani@gatunes © 2020', renderer.width * 0.5, renderer.height * 0.83);
    ctx.fillText('textures by greenpixel', renderer.width * 0.5, renderer.height * 0.89);
    ctx.fillText('made with three.js', renderer.width * 0.5, renderer.height * 0.95);
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
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
    this.rotation.x = Math.PI * -0.15;
  }
}

export default Title;
