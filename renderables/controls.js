import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
} from '../core/three.js';

class Controls extends Mesh {
  static setupGeometry() {
    Controls.geometry = new PlaneBufferGeometry(5, 5);
    Controls.geometry.deleteAttribute('normal');
  }

  static setupMaterial() {
    const renderer = document.createElement('canvas');
    renderer.width = 1024;
    renderer.height = 1024;
    const ctx = renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = '700 50px monospace';
    ctx.fillText('CONTROLS', renderer.width * 0.5, renderer.height * 0.2);
    ctx.font = '700 50px monospace';
    ctx.fillText('RIGHT JOYSTICK: Teleport', renderer.width * 0.5, renderer.height * 0.35);
    ctx.fillText('GRIP: Climb', renderer.width * 0.5, renderer.height * 0.45);
    ctx.fillText('LEFT JOYSTICK: Rotate', renderer.width * 0.5, renderer.height * 0.55);
    ctx.fillText('TRIGGER: Activate elevator', renderer.width * 0.5, renderer.height * 0.65);
    ctx.fillText('         Launch projectile', renderer.width * 0.5, renderer.height * 0.75);
    const texture = new CanvasTexture(renderer);
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
    this.position.set(-7.499, 2.5, 0);
    this.rotation.y = Math.PI * 0.5;
  }
}

export default Controls;
