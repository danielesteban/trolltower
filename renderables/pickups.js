import {
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  Vector3,
} from '../core/three.js';

class Pickups extends InstancedMesh {
  constructor({
    model,
    instances,
    onPick,
  }) {
    const geometry = model.geometry.clone();
    const scale = 0.5;
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new Vector3());
    const position = geometry.getAttribute('position');
    position.array = new Float32Array(position.array);
    geometry.translate(
      size.x * -0.5,
      size.y * -0.5 - geometry.boundingBox.min.y,
      size.z * -0.5
    );
    geometry.scale(scale, scale, scale);
    super(geometry, model.material, instances.length);
    this.auxMatrixA = new Matrix4();
    this.auxMatrixB = new Matrix4();
    this.auxVector = new Vector3();
    this.instances = instances.map((position, i) => ({
      index: i,
      position,
      scale: 1,
      visible: true,
    }));
    this.instanceMatrix.setUsage(DynamicDrawUsage);
    this.onPick = onPick;
    this.physics = {
      shape: 'box',
      width: size.x * scale,
      height: size.y * scale,
      depth: size.z * scale,
    };
  }

  animate({ delta, time }) {
    const {
      auxMatrixA,
      auxMatrixB,
      auxVector,
      instances,
    } = this;
    const y = Math.sin(time * 2) * 0.1;
    auxMatrixA.makeRotationY(Math.sin(time * 0.5) * 2);
    let index = 0;
    instances.forEach((instance) => {
      if (!instance.visible) {
        instance.timer -= delta;
        if (instance.timer > 0) {
          return;
        }
        instance.visible = true;
      }
      if (instance.scale < 1) {
        instance.scale = Math.min(instance.scale + delta, 1);
        auxMatrixB
          .makeScale(instance.scale, instance.scale, instance.scale)
          .premultiply(auxMatrixA);
      } else {
        auxMatrixB.copy(auxMatrixA);
      }
      auxMatrixB.setPosition(
        auxVector
          .set(0, y, 0)
          .add(instance.position)
      );
      this.setMatrixAt(index, auxMatrixB);
      index += 1;
    });
    this.count = index;
    this.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  pickAtPoint(point) {
    const { instances, onPick } = this;
    const instance = instances.find(({ position, visible }) => (
      visible && position.distanceTo(point) <= 0.5
    ));
    if (!instance) {
      return;
    }
    instance.visible = false;
    instance.scale = 0;
    instance.timer = 30;
    if (onPick) {
      onPick(instance);
    }
  }

  pickByIndex(index) {
    const { instances, onPick } = this;
    const instance = instances.find(({ index: key, visible }) => (
      visible && key === index
    ));
    if (!instance) {
      return;
    }
    instance.visible = false;
    instance.scale = 0;
    instance.timer = 30;
    if (onPick) {
      onPick(instance, true);
    }
  }
}

export default Pickups;
