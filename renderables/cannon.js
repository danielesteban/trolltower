import {
  Group,
  Quaternion,
  Vector3,
} from '../core/three.js';
// import Box from './box.js';

class Cannon extends Group {
  constructor({
    models,
    position,
    rotation,
  }) {
    super();
    const baseScale = 0.125;
    this.base = new Group();
    this.base.position.copy(position);
    this.base.rotation.order = 'YXZ';
    this.base.physics = [
      {
        shape: 'box',
        position: new Vector3(0, 3, 0),
        width: 1,
        height: 6,
        depth: 1,
      },
      {
        shape: 'box',
        position: new Vector3(0, 6.5, 0),
        width: 5,
        height: 1,
        depth: 1,
      },
      {
        shape: 'box',
        position: new Vector3(-2, 8, 0),
        width: 1,
        height: 2,
        depth: 1,
      },
      {
        shape: 'box',
        position: new Vector3(2, 8, 0),
        width: 1,
        height: 2,
        depth: 1,
      },
    ].map((box) => ({
      ...box,
      position: box.position.multiplyScalar(baseScale),
      width: box.width * baseScale,
      height: box.height * baseScale,
      depth: box.depth * baseScale,
    }));
    {
      const { geometry } = models.base;
      geometry.computeBoundingBox();
      const size = geometry.boundingBox.getSize(new Vector3());
      const model = models.base.clone();
      model.position.set(
        size.x * -0.5,
        -geometry.boundingBox.min.y,
        size.z * -0.5
      ).multiplyScalar(baseScale);
      model.scale.setScalar(baseScale);
      this.base.add(model);
    }
    // this.base.physics.forEach(({ position, width, height, depth }) => {
    //   const box = new Box(width, height, depth);
    //   box.position.copy(position);
    //   this.base.add(box);
    // });
    this.base.hinge = {
      type: 'hinge',
      friction: true,
      position: new Vector3(0, 0, 0),
      rotation: (new Quaternion()).setFromAxisAngle(new Vector3(1, 0, 0), Math.PI * -0.5),
    };
    this.add(this.base);

    const shaftScale = 0.085;
    const shaftPivot = new Vector3(0, 1.075, -0.1);
    this.shaft = new Group();
    this.shaft.position.copy(position).add(shaftPivot);
    this.shaft.physics = [
      {
        shape: 'box',
        position: new Vector3(0, 0, 0),
        width: 4,
        height: 4,
        depth: 12,
      },
      {
        shape: 'box',
        position: new Vector3(-1.5, 0.5, 7),
        width: 1,
        height: 1,
        depth: 2,
      },
      {
        shape: 'box',
        position: new Vector3(1.5, 0.5, 7),
        width: 1,
        height: 1,
        depth: 2,
      },
      {
        shape: 'box',
        position: new Vector3(0, 0.5, 7.5),
        width: 2,
        height: 1,
        depth: 1,
      },
    ].map((box) => ({
      ...box,
      position: box.position.multiplyScalar(shaftScale),
      width: box.width * shaftScale,
      height: box.height * shaftScale,
      depth: box.depth * shaftScale,
    }));
    {
      const { geometry } = models.shaft;
      geometry.computeBoundingBox();
      const size = geometry.boundingBox.getSize(new Vector3());
      const model = models.shaft.clone();
      model.rotation.x = Math.PI * -0.5;
      model.position
        .set(
          size.x * -0.5,
          size.y * -0.5 - geometry.boundingBox.min.y - 1,
          size.z * -0.5
        )
        .applyQuaternion(model.quaternion)
        .multiplyScalar(shaftScale);
      model.scale.setScalar(shaftScale);
      this.shaft.add(model);
    }
    // this.shaft.physics.forEach(({ position, width, height, depth }) => {
    //   const box = new Box(width, height, depth);
    //   box.position.copy(position);
    //   this.shaft.add(box);
    // });
    this.shaft.hinge = {
      type: 'hinge',
      friction: true,
      mesh: this.shaft,
      pivotInA: new Vector3(0, shaftPivot.y, 0),
      pivotInB: new Vector3(-shaftPivot.x, 0, -shaftPivot.z),
      axisInA: new Vector3(1, 0, 0),
      axisInB: new Vector3(1, 0, 0),
    };
    this.add(this.shaft);

    this.shot = {
      launchPoint: new Vector3(0, 0, -1),
      position: new Vector3(),
      direction: new Vector3(),
    };

    this.base.rotation.y = rotation;
    this.shaft.quaternion.multiply(this.base.quaternion);
  }

  getShot() {
    const {
      shaft,
      shot,
    } = this;
    shaft.localToWorld(shot.position.copy(shot.launchPoint));
    shaft.getWorldPosition(shot.direction);
    shot.direction.subVectors(shot.position, shot.direction).normalize();
    return shot;
  }
}

export default Cannon;
