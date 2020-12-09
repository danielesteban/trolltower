import { BufferGeometry, IcosahedronGeometry } from '../core/three.js';
import Bodies from './bodies.js';

class Spheres extends Bodies {
  static setupGeometry() {
    const sphere = new IcosahedronGeometry(0.2, 3);
    sphere.faces.forEach((face) => (
      face.color.offsetHSL(0, 0, -(0.2 + Math.random() * 0.1))
    ));
    const geometry = (new BufferGeometry()).fromGeometry(sphere);
    geometry.physics = {
      shape: 'sphere',
      radius: sphere.parameters.radius,
    };
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    Spheres.geometry = geometry;
  }

  constructor({
    count = 100,
    material,
    sfx,
    sound,
    soundCount = 10,
  }) {
    if (!Spheres.geometry) {
      Spheres.setupGeometry();
    }
    super({
      count,
      material,
      geometry: Spheres.geometry,
    });
    if (sfx && sound && soundCount > 0) {
      Promise.all([...Array(soundCount)].map(() => (
        sfx.load(sound)
          .then((sound) => {
            sound.filter = sound.context.createBiquadFilter();
            sound.setFilter(sound.filter);
            sound.setRefDistance(2);
            sound.setVolume(1 / 3);
            this.add(sound);
            return sound;
          })
      )))
        .then((sounds) => {
          this.sounds = sounds;
        });
    }
  }

  playSound(position) {
    const { sounds } = this;
    if (!sounds) {
      return;
    }
    const sound = sounds.find(({ isPlaying }) => (!isPlaying));
    if (sound && sound.context.state === 'running') {
      sound.filter.frequency.value = (Math.random() + 0.5) * 1000;
      sound.position.copy(position);
      sound.play();
    }
  }
}

export default Spheres;
