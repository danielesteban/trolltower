import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
} from '../core/three.js';

class Controls extends Mesh {
  static setupGeometry() {
    Controls.geometry = new PlaneBufferGeometry(5, 3.5);
    Controls.geometry.deleteAttribute('normal');
  }

  static setupMaterial() {
    const renderer = document.createElement('canvas');
    renderer.width = 1000;
    renderer.height = 700;
    const ctx = renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = '700 50px monospace';
    ctx.fillText('CONTROLS', renderer.width * 0.5, renderer.height * 0.15);
    ctx.font = '700 50px monospace';
    ctx.fillText('RIGHT JOYSTICK: Teleport', renderer.width * 0.5, renderer.height * 0.365);
    ctx.fillText('GRIP: Climb', renderer.width * 0.5, renderer.height * 0.505);
    ctx.fillText('LEFT JOYSTICK: Rotate', renderer.width * 0.5, renderer.height * 0.645);
    ctx.fillText('TRIGGER: Activate elevator', renderer.width * 0.5, renderer.height * 0.785);
    ctx.fillText('         Launch projectile', renderer.width * 0.5, renderer.height * 0.925);
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    Controls.material = new MeshBasicMaterial({ map: texture, transparent: true });
  }

  constructor() {
    if (!Controls.geometry) {
      Controls.setupGeometry();
    }
    if (!Controls.material) {
      Controls.setupMaterial();
    }
    super(
      Controls.geometry,
      Controls.material
    );
    this.position.set(-7.999, 2.75, 0);
    this.rotation.y = Math.PI * 0.5;
  }
}

export default Controls;
