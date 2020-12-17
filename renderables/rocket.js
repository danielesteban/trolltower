import {
  Box3,
  Group,
  Vector3,
} from '../core/three.js';

class Rocket extends Group {
  constructor({
    models,
    position,
    rotation,
    onAnimation,
    onTrigger,
    onReset,
  }) {
    super();
    this.position.copy(position);
    this.initialPosition = this.position.clone();
    this.rotation.set(0, rotation, 0);
    this.updateMatrixWorld();
    this.bounds = (
      new Box3(new Vector3(-0.75, 0, -0.75), new Vector3(0.75, 4, 0.75))
    ).applyMatrix4(this.matrixWorld);
    this.enabled = false;
    this.onAnimation = onAnimation;
    this.onTrigger = onTrigger;
    this.onReset = onReset;
    models.load('models/rocket.glb')
      .then((model) => {
        model.scale.setScalar(0.25);
        this.add(model);
      });
  }

  animate({ delta }) {
    const {
      enabled,
      onAnimation,
      position,
      speed,
    } = this;
    if (!enabled) {
      return;
    }
    this.timer -= delta;
    if (this.timer <= 0) {
      this.reset();
      return;
    }
    const step = speed * delta;
    this.speed += delta * 5;
    position.y += step;
    this.tick -= delta;
    const tick = this.tick <= 0;
    if (tick) {
      this.tick = 0.05 + Math.random() * 0.05;
    }
    onAnimation({ step, tick });
  }

  trigger() {
    const { enabled, onTrigger } = this;
    if (enabled) {
      return;
    }
    this.enabled = true;
    this.speed = 0;
    this.tick = 0;
    this.timer = 10;
    onTrigger();
  }

  reset() {
    const { initialPosition, position, onReset } = this;
    this.enabled = false;
    position.copy(initialPosition);
    this.updateMatrixWorld();
    onReset();
  };
}

export default Rocket;
