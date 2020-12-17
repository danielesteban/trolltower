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

  constructor({
    anchor,
    color,
    onEnd,
    onTrigger,
    speed = 0.5,
  }) {
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
    this.onEnd = onEnd;
    this.onTrigger = onTrigger;
    this.speed = speed;
    this.material.color.setHex(color);
    this.material.opacity = 0;
    this.matrixAutoUpdate = false;
    this.visible = false;
    this.renderOrder = 1;
  }

  animate({ delta }) {
    const {
      anchor,
      material,
      onEnd,
      position,
      speed,
      visible,
    } = this;
    if (!visible) {
      return;
    }
    position.copy(anchor.position);
    this.updateMatrix();
    this.updateMatrixWorld();
    material.opacity = Math.min(material.opacity + delta * speed, 0.9);
    if (material.opacity === 0.9) {
      this.reset();
      if (onEnd) {
        onEnd();
      }
    }
  }

  reset() {
    const { material } = this;
    material.opacity = 0;
    this.visible = false;
  }

  trigger() {
    const { onTrigger, visible } = this;
    if (visible) {
      return;
    }
    this.visible = true;
    if (onTrigger) {
      onTrigger();
    }
  }
}

export default Effect;
