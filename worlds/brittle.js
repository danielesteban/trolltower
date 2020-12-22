import { Color, FogExp2, Vector3 } from '../core/three.js';
import Gameplay from '../core/gameplay.js';
import Rain from '../renderables/rain.js';

class Brittle extends Gameplay {
  constructor(scene, { instance, offset, room, spectator }) {
    super({
      room: room || `Brittle-${instance}`,
      scene,
      offset,
      spectator,
      cannons: {
        instances: [
          { position: new Vector3(3.75, 26.5, -3.75), rotation: 0 },
          { position: new Vector3(10.75, 22, -16.75), rotation: Math.PI * 0.5 },
          { position: new Vector3(2.25, 18.5, -27.25), rotation: Math.PI },
          { position: new Vector3(-11.25, 21.5, -26.25), rotation: Math.PI * -0.5 },
        ],
        model: 'models/cannon.glb',
      },
      climbables: 'models/brittlePhysics.json',
      effects: [
        {
          id: 'falling',
          color: 0,
          speed: 1,
          onEnd: () => this.respawn(),
        },
      ],
      elevators: [
        { position: new Vector3(0, 27, 0.75), rotation: Math.PI },
      ],
      lightmap: 'models/brittleLightmap.json',
      platforms: {
        instances: [
          {
            origin: new Vector3(0, 28, -5.5),
            direction: new Vector3(0, -7, -21),
            speed: 0.5,
          },
        ],
        model: 'models/platform.glb',
      },
      pickups: {
        instances: [
          new Vector3(14.25, 24, -12.25),
          new Vector3(3.75, 17, -34.75),
          new Vector3(-11.25, 22.5, -21.75),
        ],
        model: 'models/barrel.glb',
      },
      rocketOrigin: new Vector3(-17.5, 21.25, -25.5),
      rocketRotation: Math.PI * 0.5,
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
          child.matrixAutoUpdate = false;
          child.updateMatrix();
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
    if (player.head.position.y < 9) {
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

Brittle.display = {
  name: 'Brittle Hills',
  background: '#005511',
  foreground: '#fff',
  fontSize: 28,
};

export default Brittle;
