import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
} from '../core/three.js';

class SkinTitle extends Mesh {
  static setupGeometry() {
    SkinTitle.geometry = new PlaneBufferGeometry(2, 1.5);
    SkinTitle.geometry.deleteAttribute('normal');
  }

  static setupMaterial() {
    const renderer = document.createElement('canvas');
    renderer.width = 400;
    renderer.height = 300;
    const ctx = renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = '700 60px monospace';
    ctx.fillText('SKIN EDITOR', renderer.width * 0.5, renderer.height * 0.2);
    ctx.font = '700 30px monospace';
    ctx.fillText('Trigger: Paint', renderer.width * 0.5, renderer.height * 0.5);
    ctx.fillText('Grip: Erase', renderer.width * 0.5, renderer.height * 0.7);
    ctx.fillText('A/X: Pick', renderer.width * 0.5, renderer.height * 0.9);
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    SkinTitle.material = new MeshBasicMaterial({ map: texture, transparent: true });
  }

  constructor() {
    if (!SkinTitle.geometry) {
      SkinTitle.setupGeometry();
    }
    if (!SkinTitle.material) {
      SkinTitle.setupMaterial();
    }
    super(
      SkinTitle.geometry,
      SkinTitle.material
    );
    this.position.set(0, 2.05, 1.999);
    this.rotation.y = Math.PI;
  }
}

export default SkinTitle;
