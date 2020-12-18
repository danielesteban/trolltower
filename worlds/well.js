import { Color, FogExp2, Vector3 } from '../core/three.js';
import Gameplay from '../core/gameplay.js';

class Well extends Gameplay {
  constructor(scene, { instance, offset, spectator }) {
    super({
      room: `Well-${instance}`,
      scene,
      offset,
      spectator,
      cannons: {
        instances: [...Array(3)].map((v, i) => {
          const angle = i * Math.PI * 0.5;
          const dist = 13.25;
          return {
            position: new Vector3(
              Math.cos(angle) * dist,
              20,
              Math.sin(angle) * dist
            ),
            rotation: Math.PI * 0.5 - angle,
          };
        }),
        model: 'models/cannon.glb',
      },
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
        instances: [...Array(7)].map((v, i) => {
          const angle = (i % 4) * Math.PI * 0.5;
          const dist = i < 3 ? 15 : 2;
          return new Vector3(
            Math.cos(angle) * dist,
            i < 3 ? 26.5 : 14,
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
