import {
  BoxBufferGeometry,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Quaternion,
  Vector3,
} from '../core/three.js';

class Button extends Mesh {
  static setupGeometry() {
    Button.geometry = new BoxBufferGeometry(0.375, 0.375, 0.125);
    const uv = Button.geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i += 1) {
      if (i >= 0 && i < 8) {
        uv.setX(i, uv.getX(i) / 4);
      }
      if (i >= 8 && i < 14) {
        uv.setY(i, uv.getY(i) / 4);
      }
    }
    Button.geometry.deleteAttribute('normal');
  }

  static setupMaterial() {
    const renderer = document.createElement('canvas');
    renderer.width = 256;
    renderer.height = 256;
    const ctx = renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 60px monospace';
    const color = new Color();
    const step = 16;
    for (let y = 0; y < renderer.height; y += step) {
      for (let x = 0; x < renderer.width; x += step) {
        color.setHSL(0, 1, 0.1 + Math.random() * 0.5);
        ctx.fillStyle = `#${color.getHexString()}`;
        ctx.fillRect(x, y, step, step);
      }
    }
    ctx.fillStyle = '#f99';
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#300';
    ctx.fillText('BOOM', renderer.width * 0.5, renderer.height * 0.5);
    const texture = new CanvasTexture(renderer);
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    Button.material = new MeshBasicMaterial({ map: texture });
  }

  constructor({ position }) {
    if (!Button.geometry) {
      Button.setupGeometry();
    }
    if (!Button.material) {
      Button.setupMaterial();
    }
    super(
      Button.geometry,
      Button.material
    );
    this.position.copy(position);
    this.initialPosition = position.clone();

    this.slider = {
      type: 'slider',
      limits: {
        linear: { lower: 0, upper: 0.0625 },
      },
      position: new Vector3(0, 0, 0.125),
      rotation: (new Quaternion()).setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * -0.5),
    };

    this.trigger = new Group();
    this.trigger.position.copy(position).add(new Vector3(0, 0, 0.15));
    this.trigger.updateMatrixWorld();
    this.trigger.physics = {
      shape: 'box',
      width: Button.geometry.parameters.width,
      height: Button.geometry.parameters.height,
      depth: 0.1,
    };
  }
}

export default Button;
