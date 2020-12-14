import {
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  Vector3,
} from '../core/three.js';

class Platforms extends InstancedMesh {
  constructor({
    model,
    instances,
  }) {
    const geometry = model.geometry.clone();
    const scale = 0.1;
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
    this.auxMatrix = new Matrix4();
    this.auxVector = new Vector3();
    this.instanceMatrix.setUsage(DynamicDrawUsage);
    this.physics = {
      shape: 'box',
      width: size.x * scale,
      height: size.y * scale,
      depth: size.z * scale,
    };
    this.instances = instances.map(({
      direction,
      origin,
      speed,
    }, i) => {
      direction.multiplyScalar(0.5);
      origin.add(direction);
      this.auxMatrix.setPosition(origin);
      this.setMatrixAt(i, this.auxMatrix);
      return {
        direction,
        movement: new Vector3(),
        origin,
        speed,
      };
    });
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  animate({ serverTime }) {
    const {
      auxMatrix,
      auxVector,
      instances,
    } = this;
    instances.forEach(({
      direction,
      movement,
      origin,
      speed,
    }, i) => {
      this.getMatrixAt(i, auxMatrix);
      movement.setFromMatrixPosition(auxMatrix);
      auxVector
        .copy(origin)
        .addScaledVector(direction, Math.sin(serverTime * speed));
      movement.subVectors(movement, auxVector);
      auxMatrix.setPosition(auxVector);
      this.setMatrixAt(i, auxMatrix);
    });
    this.instanceMatrix.needsUpdate = true;
  }

  getMovement(index) {
    const { instances } = this;
    return instances[index].movement;
  }
}

export default Platforms;
