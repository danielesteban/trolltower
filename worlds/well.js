import {
  Color,
  FogExp2,
  Vector3,
} from '../core/three.js';
import Gameplay from './gameplay.js';

class Well extends Gameplay {
  constructor(scene, { offset, instance }) {
    const elevators = [
      { position: new Vector3(4, 27.5, 11.25), rotation: Math.PI },
    ];

    super({
      elevators,
      rocketOrigin: new Vector3(4, 4, 0),
      scene,
      offset,
      room: `Well-${instance}`,
      terrainPhysics: 'models/wellTerrainPhysics.json',
      towerPhysics: 'models/wellPhysics.json',
    });

    const { ambient, models } = scene;

    ambient.set('sounds/forest.ogg');
    scene.background = new Color(0x001122);
    scene.fog = new FogExp2(scene.background.getHex(), 0.06);

    models.load('models/well.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
        this.spawn.isOpen = true;
      });
  }
}

export default Well;
