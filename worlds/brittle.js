import { Color, FogExp2, Vector3 } from '../core/three.js';
import Gameplay from '../core/gameplay.js';
import Rain from '../renderables/rain.js';

class Brittle extends Gameplay {
  constructor(scene, { offset, instance }) {
    super({
      climbables: 'models/brittlePhysics.json',
      effects: [
        {
          id: 'falling',
          color: 0,
          speed: 2,
          onEnd: () => this.respawn(),
        },
      ],
      elevators: [
        { position: new Vector3(0, 27, 0.75), rotation: Math.PI },
      ],
      pickups: {
        instances: [
          new Vector3(11, 22.5, -16.5),
          new Vector3(3.5, 17, -34.5),
          new Vector3(-11.25, 22.5, -21.75),
        ],
        model: 'models/barrel.glb',
      },
      rocketOrigin: new Vector3(-17.5, 21.25, -25.5),
      rocketRotation: Math.PI * 0.5,
      scene,
      offset,
      room: `Brittle-${instance}`,
    });

    const { ambient, models } = scene;

    ambient.set([
      'sounds/rain.ogg',
      'sounds/forest.ogg',
    ]);
    scene.background = new Color(0x110A1A);
    scene.fog = new FogExp2(scene.background.getHex(), 0.03);

    const rain = new Rain({ anchor: this.player, heightmapScale: 0.5 });
    this.add(rain);
    this.rain = rain;

    models.load('models/brittle.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        model.traverse((child) => {
          if (child.isMesh) {
            rain.addToHeightmap(child);
          }
        });
        this.add(model);
        rain.reset();
        rain.visible = true;
        this.spawn.isOpen = true;
      });
  }

  onAnimationTick(animation) {
    const { effects, player, rain } = this;
    super.onAnimationTick(animation);
    rain.animate(animation);
    if (player.head.position.y < 8) {
      effects.falling.trigger();
      player.controllers.forEach((controller) => {
        if (controller.hand) {
          controller.pulse(0.4, 10);
        }
      });
    }
  }

  onUnload() {
    const { rain } = this;
    super.onUnload();
    rain.dispose();
  }
}

export default Brittle;
