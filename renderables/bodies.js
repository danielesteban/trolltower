import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
} from '../core/three.js';

class Bodies extends InstancedMesh {
  static setupMaterial() {
    Bodies.material = new MeshBasicMaterial({
      vertexColors: true,
    });
  }

  constructor({
    count,
    geometry,
    material,
    sfx,
    sound,
    soundCount = 10,
  }) {
    if (!Bodies.material) {
      Bodies.setupMaterial();
    }
    super(
      geometry,
      material || Bodies.material,
      count
    );
    const color = new Color();
    for (let i = 0; i < count; i += 1) {
      this.setColorAt(i, color.setHex(0xFFFFFF * Math.random()));
    }
    this.auxMatrix = new Matrix4();
    if (sfx && sound && soundCount > 0) {
      Promise.all([...Array(soundCount)].map(() => (
        sfx.load(sound)
          .then((sound) => {
            sound.filter = sound.context.createBiquadFilter();
            sound.setFilter(sound.filter);
            sound.setRefDistance(3);
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

  getColorAt(index, color) {
    const { instanceColor } = this;
    return color.fromBufferAttribute(instanceColor, index);
  }

  getPositionAt(index, position) {
    const { auxMatrix } = this;
    this.getMatrixAt(index, auxMatrix);
    return position.setFromMatrixPosition(auxMatrix);
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

export default Bodies;
