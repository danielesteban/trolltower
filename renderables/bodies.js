import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
} from '../core/three.js';

class Bodies extends InstancedMesh {
  static setupMaterial() {
    Bodies.material = new MeshBasicMaterial({
      vertexColors: true,
    });
  }

  constructor({ count, material, geometry }) {
    if (!Bodies.material) {
      Bodies.setupMaterial();
    }
    super(
      geometry,
      material || Bodies.material,
      count
    );
    const color = new Color();
    for (let i = 0; i < count; i += 1) {
      this.setColorAt(i, color.setHex(0xFFFFFF * Math.random()));
    }
    this.auxMatrix = new Matrix4();
  }

  getColorAt(index, color) {
    const { instanceColor } = this;
    return color.fromBufferAttribute(instanceColor, index);
  }

  getPositionAt(index, position) {
    const { auxMatrix } = this;
    this.getMatrixAt(index, auxMatrix);
    return position.setFromMatrixPosition(auxMatrix);
  }
}

export default Bodies;
