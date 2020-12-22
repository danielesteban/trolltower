import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
} from '../core/three.js';

class SponsorsTitle extends Mesh {
  static setupGeometry() {
    SponsorsTitle.geometry = new PlaneBufferGeometry(4, 1);
    SponsorsTitle.geometry.deleteAttribute('normal');
  }

  static setupMaterial() {
    const renderer = document.createElement('canvas');
    renderer.width = 800;
    renderer.height = 200;
    const ctx = renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = '700 80px monospace';
    ctx.fillText('SPONSORS', renderer.width * 0.5, renderer.height * 0.5);
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    SponsorsTitle.material = new MeshBasicMaterial({ map: texture, transparent: true });
  }

  constructor() {
    if (!SponsorsTitle.geometry) {
      SponsorsTitle.setupGeometry();
    }
    if (!SponsorsTitle.material) {
      SponsorsTitle.setupMaterial();
    }
    super(
      SponsorsTitle.geometry,
      SponsorsTitle.material
    );
    this.position.set(-0.499, 4, 0);
    this.rotation.y = Math.PI * 0.5;
  }
}

export default SponsorsTitle;
