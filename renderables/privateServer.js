import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
} from '../core/three.js';

class PrivateServer extends Mesh {
  static setupGeometry() {
    PrivateServer.geometry = new PlaneBufferGeometry(4, 1.5);
    PrivateServer.geometry.deleteAttribute('normal');
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
    ctx.fillText('YOUR PRIVATE SERVER', renderer.width * 0.5, renderer.height * (1 / 3));
    ctx.font = '700 40px monospace';
    ctx.fillText('(Only for sponsors)', renderer.width * 0.5, renderer.height * (2 / 3));
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    PrivateServer.material = new MeshBasicMaterial({ map: texture, transparent: true });
  }

  constructor() {
    if (!PrivateServer.geometry) {
      PrivateServer.setupGeometry();
    }
    if (!PrivateServer.material) {
      PrivateServer.setupMaterial();
    }
    super(
      PrivateServer.geometry,
      PrivateServer.material
    );
    this.position.set(-7.999, 3.75, -5);
    this.rotation.y = Math.PI * 0.5;
  }
}

export default PrivateServer;
