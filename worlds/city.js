import { Color, FogExp2, Vector3 } from '../core/three.js';
import Gameplay from '../core/gameplay.js';
import Rain from '../renderables/rain.js';

class City extends Gameplay {
  constructor(scene, { instance, offset, room, spectator }) {
    super({
      room: room || `City-${instance}`,
      scene,
      offset,
      spectator,
      climbables: 'models/cityPhysics.json',
      elevators: [
        { position: new Vector3(4.5, 10, 0.25), rotation: 0 },
      ],
      rocketOrigin: new Vector3(4.5, 32.25, -13),
    });

    const { ambient, models } = scene;

    ambient.set([
      'sounds/rain.ogg',
      'sounds/city.ogg',
    ]);
    scene.background = new Color(0x180B1B);
    scene.fog = new FogExp2(scene.background.getHex(), 0.02);

    const rain = new Rain({ anchor: this.player, heightmapScale: 0.5 });
    this.add(rain);
    this.rain = rain;

    models.load('models/city.glb')
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
    const { rain } = this;
    super.onAnimationTick(animation);
    rain.animate(animation);
  }

  onUnload() {
    const { rain } = this;
    super.onUnload();
    rain.dispose();
  }
}

City.display = {
  name: 'Light City',
  background: '#888822',
  foreground: '#fff',
};

export default City;
