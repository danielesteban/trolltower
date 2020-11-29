import {
  Color,
  FogExp2,
  Group,
  Vector3,
} from '../core/three.js';
import Gameplay from './gameplay.js';
import Ocean from '../renderables/ocean.js';

class Tower extends Gameplay {
  constructor(scene, { offset, instance }) {
    const elevators = [];
    const boats = [
      new Vector3(-17.5, 3.5, -21),
      new Vector3(21, 3.5, -21),
    ].map((position) => {
      const boat = new Group();
      boat.position.copy(position);
      boat.rotation.order = 'YXZ';
      boat.lookAt(0, position.y, 0);
      boat.rotateY(Math.PI);
      boat.updateMatrixWorld();
      elevators.push({
        position: boat.localToWorld(new Vector3(0, -0.5, 4.25)),
        rotation: boat.rotation.y - Math.PI,
      });
      return boat;
    });

    super({
      elevators,
      groundColor: 0x05bb7c,
      rocketOrigin: new Vector3(0, 31.25, 0),
      scene,
      offset,
      room: `Tower-${instance}`,
      terrainPhysics: 'models/towerIslandPhysics.json',
      towerPhysics: 'models/towerPhysics.json',
    });

    const { ambient, models, translocables } = scene;
    ambient.set('sounds/sea.ogg');
    scene.background = new Color(0x336688);
    scene.fog = new FogExp2(scene.background.getHex(), 0.02);

    const ocean = new Ocean();
    ocean.position.y = 1.675;
    this.add(ocean);

    const boatModelOffset = new Vector3(-4, -3, 0);
    Promise.all([
      models.load('models/boat.glb')
        .then((model) => {
          model.position.copy(boatModelOffset);
          model.scale.setScalar(0.5);
          boats.forEach((boat) => {
            boat.add(model.clone());
            this.add(boat);
          });
        }),
      models.load('models/tower.glb')
        .then((model) => {
          model.scale.setScalar(0.5);
          this.add(model);
        }),
    ])
      .then(() => {
        this.spawn.isOpen = true;
      });

    Promise.all([
      scene.getPhysics(),
      models.physics('models/boatPhysics.json', 0.5),
    ])
      .then(([/* physics */, boatPhysics]) => {
        boats.forEach((boat) => {
          boat.physics = [];
          boatPhysics.forEach((box) => {
            box = box.clone();
            box.position.add(boatModelOffset);
            translocables.push(box);
            boat.add(box);
            boat.physics.push({
              shape: 'box',
              position: box.position,
              width: box.geometry.parameters.width,
              height: box.geometry.parameters.height,
              depth: box.geometry.parameters.depth,
            });
          });
          this.physics.addMesh(boat);
        });
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    Ocean.animate(animation);
  }
}

export default Tower;
