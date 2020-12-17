import {
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  Vector3,
} from '../core/three.js';

class Ground extends Mesh {
  static setupGeometry() {
    Ground.geometry = new PlaneBufferGeometry(1, 1);
    Ground.geometry.rotateX(Math.PI * -0.5);
    Ground.geometry.deleteAttribute('normal');
    Ground.geometry.deleteAttribute('uv');
    Ground.geometry.physics = {
      shape: 'plane',
      normal: new Vector3(0, 1, 0),
    };
  }

  static setupMaterial() {
    Ground.material = new MeshBasicMaterial();
  }

  constructor(width, depth, color) {
    if (!Ground.geometry) {
      Ground.setupGeometry();
    }
    if (!Ground.material) {
      Ground.setupMaterial();
    }
    super(
      Ground.geometry,
      Ground.material.clone()
    );
    this.material.color.setHex(color).convertSRGBToLinear();
    this.scale.set(width, 1, depth);
  }
}

export default Ground;
