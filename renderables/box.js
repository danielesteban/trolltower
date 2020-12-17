import {
  BoxBufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from '../core/three.js';

// Transparent box for debugging/triggers

class Box extends Mesh {
  static setupGeometry() {
    Box.geometry = new BoxBufferGeometry(1, 1, 1);
    Box.geometry.deleteAttribute('normal');
    Box.geometry.deleteAttribute('uv');
  }

  static setupMaterial() {
    Box.material = new MeshBasicMaterial({ opacity: 0.5, transparent: true });
  }

  constructor(width, height, depth) {
    if (!Box.geometry) {
      Box.setupGeometry();
    }
    if (!Box.material) {
      Box.setupMaterial();
    }
    super(
      Box.geometry,
      Box.material
    );
    this.scale.set(width, height, depth);
    this.physics = {
      shape: 'box',
      width,
      height,
      depth,
    };
  }
}

export default Box;
