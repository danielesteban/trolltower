import { InstancedMesh, Matrix4, Vector3 } from '../core/three.js';
import Box from './box.js';

class Platforms extends InstancedMesh {
  constructor({
    platforms,
    onMovement,
  }) {
    if (!Box.geometry) {
      Box.setupGeometry();
    }
    if (!Box.material) {
      Box.setupMaterial();
    }
    super(Box.geometry, Box.material, platforms.length);
    this.auxMatrix = new Matrix4();
    this.auxVector = new Vector3();
    this.onMovement = onMovement;
    this.platforms = platforms.map(({
      direction,
      origin,
      size: {
        width,
        height,
        depth,
      },
      speed,
    }, i) => {
      direction.multiplyScalar(0.5);
      origin.add(direction);
      this.auxMatrix.makeScale(width, height, depth);
      this.auxMatrix.setPosition(origin);
      this.setMatrixAt(i, this.auxMatrix);
      return {
        direction,
        movement: new Vector3(),
        onMovement,
        origin,
        speed,
      };
    });
  }

  animate({ serverTime }) {
    const {
      auxMatrix,
      auxVector,
      onMovement,
      platforms,
    } = this;
    platforms.forEach(({
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
      movement.subVectors(auxVector, movement);
      auxMatrix.setPosition(auxVector);
      this.setMatrixAt(i, auxMatrix);
      onMovement(i, movement);
    });
    this.instanceMatrix.needsUpdate = true;
  }
}

export default Platforms;
