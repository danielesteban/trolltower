import { Color, FogExp2, Vector3 } from '../core/three.js';
import Gameplay from '../core/gameplay.js';

class Well extends Gameplay {
  constructor(scene, { instance, offset, spectator }) {
    super({
      room: `Well-${instance}`,
      scene,
      offset,
      spectator,
      climbables: 'models/wellPhysics.json',
      elevators: [
        { position: new Vector3(19.25, 3, 0), rotation: Math.PI * -0.5 },
        { position: new Vector3(-19.25, 3, 0), rotation: Math.PI * 0.5 },
      ],
      lava: [
        { position: new Vector3(0, 0.25, 0), width: 36, depth: 36 },
      ],
      platforms: {
        instances: [...Array(18)].map((v, i) => {
          const j = i > 8 ? i + 2 : i;
          return {
            origin: new Vector3(
              -14.25 + j * 1.5,
              6 + Math.sin(j * 4) * 0.1,
              6 * (j % 2 === 0 ? 1 : -1)
            ),
            direction: (new Vector3(0, 0, 12)).multiplyScalar(j % 2 === 0 ? -1 : 1),
            speed: 0.5,
          };
        }),
        model: 'models/platform.glb',
      },
      pickups: {
        instances: [...Array(6)].map((v, i) => {
          const angle = (i % 3) * Math.PI * 0.5;
          const dist = 15;
          return new Vector3(
            Math.cos(angle) * dist,
            26.5,
            Math.sin(angle) * dist
          );
        }),
        model: 'models/barrel.glb',
      },
      rocketOrigin: new Vector3(0, 25.75, -19),
    });

    const { ambient, models } = scene;
    ambient.set('sounds/forest.ogg');
    scene.background = new Color(0x220011);
    scene.fog = new FogExp2(scene.background.getHex(), 0.025);
    models.load('models/well.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
        this.spawn.isOpen = true;
      });
  }
}

export default Well;
