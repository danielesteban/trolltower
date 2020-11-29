import {
  Color,
  FogExp2,
  Vector3,
} from '../core/three.js';
import Gameplay from './gameplay.js';
import Lava from '../renderables/lava.js';

class Well extends Gameplay {
  constructor(scene, { offset, instance }) {
    const elevators = [
      { position: new Vector3(12.75, 33.5, 0), rotation: Math.PI * -0.5 },
    ];

    super({
      elevators,
      rocketOrigin: new Vector3(0, 7.5, 0),
      scene,
      offset,
      room: `Well-${instance}`,
      terrainPhysics: 'models/wellTerrainPhysics.json',
      towerPhysics: 'models/wellPhysics.json',
    });

    const { ambient, models } = scene;

    ambient.set('sounds/forest.ogg');
    scene.background = new Color(0x0A0A11);
    scene.fog = new FogExp2(scene.background.getHex(), 0.02);

    this.add(new Lava());

    models.load('models/well.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
        this.spawn.isOpen = true;
      });
  }
}

export default Well;
