import { Vector3 } from '../core/three.js';
import Box from './box.js';

class Platform extends Box {
  constructor({
    direction,
    onMovement,
    origin,
    size: {
      width,
      height,
      depth,
    },
    speed,
  }) {
    super(width, height, depth);
    this.collisionAutoUpdate = true;
    this.position.copy(origin);
    this.direction = direction;
    this.movement = new Vector3();
    this.onMovement = onMovement;
    this.origin = origin;
    this.speed = speed;
  }

  animate({ time }) {
    const {
      direction,
      movement,
      onMovement,
      origin,
      position,
      speed,
    } = this;
    movement.copy(position);
    position
      .copy(origin)
      .addScaledVector(direction, Math.sin(time * speed));
    movement.subVectors(position, movement);
    onMovement(movement);
  }
}

export default Platform;
