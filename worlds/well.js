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
        { position: new Vector3(13.25, 33.5, 0), rotation: Math.PI * -0.5 },
        { position: new Vector3(-13.25, 33.5, 0), rotation: Math.PI * 0.5 },
      ],
      lava: [
        { position: new Vector3(0, 0.25, 0), width: 32, depth: 32 },
      ],
      platforms: {
        instances: [...Array(8)].map((v, i) => {
          const angle = ((Math.PI * 2) / 8) * i;
          const dist = 4;
          const origin = new Vector3(
            Math.cos(angle) * dist,
            10.05,
            Math.sin(angle) * dist
          );
          return {
            origin,
            direction: origin.clone().sub(new Vector3(0, 6, 0)).normalize().multiplyScalar(9),
            speed: i % 2 === 0 ? 0.5 : 0.75,
          };
        }),
        model: 'models/platform.glb',
      },
      pickups: {
        instances: [...Array(8)].map((v, i) => {
          const angle = i * Math.PI * 0.5;
          const dist = 11.5;
          return new Vector3(
            Math.cos(angle) * dist,
            Math.floor(i / 4) === 0 ? 27.5 : 14.5,
            Math.sin(angle) * dist
          );
        }),
        model: 'models/barrel.glb',
      },
      rocketOrigin: new Vector3(0, 7.25, 0),
    });

    const { ambient, models } = scene;
    ambient.set('sounds/forest.ogg');
    scene.background = new Color(0x0A0A11);
    scene.fog = new FogExp2(scene.background.getHex(), 0.02);
    models.load('models/well.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
        this.spawn.isOpen = true;
      });
  }
}

export default Well;
