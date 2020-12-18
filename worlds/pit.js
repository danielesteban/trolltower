import { Color, FogExp2, Vector3 } from '../core/three.js';
import Gameplay from '../core/gameplay.js';

class Pit extends Gameplay {
  constructor(scene, { instance, offset, spectator }) {
    super({
      room: `Pit-${instance}`,
      scene,
      offset,
      spectator,
      elevators: [
        { position: new Vector3(0, 2.5, -31.75), rotation: 0 },
        { position: new Vector3(0, 2.5, 31.75), rotation: Math.PI },
      ],
      lava: [
        { position: new Vector3(0, 0.25, -22), width: 16, depth: 20 },
        { position: new Vector3(0, 0.25, 0), width: 16, depth: 24 },
        { position: new Vector3(0, 0.25, 22), width: 16, depth: 20 },
      ],
      platforms: {
        instances: [...Array(38)].map((v, i) => {
          const j = i > 18 ? i + 2 : i;
          return {
            origin: new Vector3(
              6 * (j % 2 === 0 ? 1 : -1),
              5 + Math.sin(j * 4) * 0.1,
              -29.25 + j * 1.5
            ),
            direction: (new Vector3(12, 0, 0)).multiplyScalar(j % 2 === 0 ? -1 : 1),
            speed: 0.5,
          };
        }),
        model: 'models/platform.glb',
      },
      pickups: {
        instances: [...Array(6)].map((v, i) => (
          new Vector3(
            6.75 * (i % 2 === 0 ? 1 : -1),
            3.5,
            -16 + Math.floor(i / 2) * 16
          )
        )),
        model: 'models/barrel.glb',
      },
      rocketOrigin: new Vector3(0, 2.75, 0),
      rocketRotation: Math.PI * 0.5,
      terrainPhysics: 'models/pitPhysics.json',
    });

    scene.background = new Color(0x220011);
    scene.fog = new FogExp2(scene.background.getHex(), 0.02);
    scene.models.load('models/pit.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
        this.spawn.isOpen = true;
      });
  }
}

export default Pit;
