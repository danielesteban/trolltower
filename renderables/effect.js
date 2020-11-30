import {
  BackSide,
  IcosahedronBufferGeometry,
  Mesh,
  MeshBasicMaterial,
} from '../core/three.js';

class Effect extends Mesh {
  static setupGeometry() {
    Effect.geometry = new IcosahedronBufferGeometry(0.5, 3);
    Effect.geometry.deleteAttribute('normal');
    Effect.geometry.deleteAttribute('uv');
  }

  static setupMaterial() {
    Effect.material = new MeshBasicMaterial({
      depthTest: false,
      side: BackSide,
      transparent: true,
    });
  }

  constructor({ anchor, color }) {
    if (!Effect.geometry) {
      Effect.setupGeometry();
    }
    if (!Effect.material) {
      Effect.setupMaterial();
    }
    super(
      Effect.geometry,
      Effect.material.clone()
    );
    this.anchor = anchor;
    this.material.color.setHex(color);
    this.material.opacity = 0;
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  animate({ delta }) {
    const {
      anchor,
      material,
      position,
    } = this;
    position.copy(anchor.position);
    this.visible = true;
    this.updateMatrix();
    this.updateMatrixWorld();
    material.opacity = Math.min(material.opacity + delta * 0.5, 1);
    if (material.opacity === 1) {
      return true;
    }
    return false;
  }

  reset() {
    const { material } = this;
    material.opacity = 0;
    this.visible = false;
  }
}

export default Effect;
