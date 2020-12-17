// Ambient sound system

class Ambient {
  constructor(isRunning) {
    this.isRunning = isRunning;
    this.sounds = [];
  }

  resume() {
    const { sounds } = this;
    this.isRunning = true;
    sounds.forEach((sound) => {
      if (sound.paused) {
        sound.play();
      }
    });
  }

  set(ambient) {
    const { isRunning, sounds } = this;

    sounds.forEach((sound) => {
      sound.fadeIn = false;
      sound.fadeOut = true;
    });

    if (ambient) {
      (Array.isArray(ambient) ? ambient : [ambient]).forEach((sound) => {
        const player = new Audio();
        player.crossOrigin = 'anonymous';
        player.fadeIn = true;
        player.loop = true;
        player.src = sound;
        player.gain = 0.2;
        player.power = 0;
        player.volume = 0;
        sounds.push(player);
        if (isRunning) {
          player.play();
        }
      });
    }
  }

  onAnimationTick({ delta }) {
    const { isRunning, sounds } = this;
    if (!isRunning) {
      return;
    }
    const step = delta * 0.5;
    let count = sounds.length;
    for (let i = 0; i < count; i += 1) {
      const sound = sounds[i];
      if (sound.fadeIn || sound.fadeOut) {
        if (sound.fadeIn) {
          sound.power += step;
          if (sound.power >= 1) {
            sound.power = 1;
            sound.fadeIn = false;
          }
        }
        if (sound.fadeOut) {
          sound.power -= step;
          if (sound.power <= 0) {
            sound.pause();
            sound.src = '';
            sounds.splice(i, 1);
            i -= 1;
            count -= 1;
            break;
          }
        }
        sound.volume = Math.cos((1.0 - sound.power) * 0.5 * Math.PI) * sound.gain;
      }
    }
  }
}

export default Ambient;
