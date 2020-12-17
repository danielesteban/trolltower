import { Group, Quaternion, Vector3 } from '../core/three.js';
import Box from './box.js';

// Door with handle

class Door extends Group {
  constructor({
    limits,
    models,
    model,
    orientation = 1,
  }) {
    super();

    this.hinge = {
      type: 'hinge',
      limits,
      position: new Vector3(0.4 * -orientation, 0, 0),
      rotation: (new Quaternion()).setFromAxisAngle(new Vector3(1, 0, 0), Math.PI * 0.5),
    };

    this.physics = [
      {
        shape: 'box',
        width: 0.95,
        height: 2.4,
        depth: 0.125,
      },
    ];

    for (let i = 0; i < 2; i += 1) {
      this.physics.push(
        {
          shape: 'box',
          position: new Vector3(0.3 * orientation, 0, 0.1375 * (i === 0 ? 1 : -1)),
          width: 0.03,
          height: 0.03,
          depth: 0.15,
        },
        {
          shape: 'box',
          position: new Vector3(0.185 * orientation, 0, 0.175 * (i === 0 ? 1 : -1)),
          width: 0.2,
          height: 0.03,
          depth: 0.03,
        }
      );
    }

    this.physics.slice(1).forEach(({
      width,
      height,
      depth,
      position,
    }) => {
      const handle = new Box(width, height, depth);
      handle.position.copy(position);
      this.add(handle);
    });

    this.translocables = [];

    if (model) {
      models.load(model)
        .then((door) => {
          const model = door.children[0].clone();
          model.position.set(0.5 * orientation, -1.75, 0.0625 * orientation);
          model.rotation.y = orientation === 1 ? Math.PI : 0;
          model.scale.set(0.5, 0.5, 0.125);
          this.translocables.push(model.children[0]);
          this.add(model);
          // const debug = new Box(0.95, 2.4, 0.125);
          // this.add(debug);
        });
    }
  }
}

export default Door;
