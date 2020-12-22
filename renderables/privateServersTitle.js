import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
} from '../core/three.js';

class PrivateServersTitle extends Mesh {
  static setupGeometry() {
    PrivateServersTitle.geometry = new PlaneBufferGeometry(4, 1.5);
    PrivateServersTitle.geometry.deleteAttribute('normal');
  }

  static setupMaterial() {
    const renderer = document.createElement('canvas');
    renderer.width = 800;
    renderer.height = 300;
    const ctx = renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = '700 50px monospace';
    ctx.fillText('PRIVATE SERVERS', renderer.width * 0.5, renderer.height * (1 / 3));
    ctx.font = '700 40px monospace';
    ctx.fillText('(For sponsors & their buddies)', renderer.width * 0.5, renderer.height * (2 / 3));
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    PrivateServersTitle.material = new MeshBasicMaterial({ map: texture, transparent: true });
  }

  constructor() {
    if (!PrivateServersTitle.geometry) {
      PrivateServersTitle.setupGeometry();
    }
    if (!PrivateServersTitle.material) {
      PrivateServersTitle.setupMaterial();
    }
    super(
      PrivateServersTitle.geometry,
      PrivateServersTitle.material
    );
    this.position.set(-0.499, 3.75, 0);
    this.rotation.y = Math.PI * 0.5;
  }
}

export default PrivateServersTitle;
