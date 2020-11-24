import { Box3, Group, Vector3 } from '../core/three.js';

class Elevator extends Group {
  constructor({
    isOpen = false,
    models,
    sfx,
    onOpen,
  }) {
    super();
    this.aux = new Box3();
    this.bounds = new Box3();
    this.isOpen = isOpen;
    this.onOpen = onOpen;
    this.translocables = [];
    this.rotation.order = 'YXZ';
    if (isOpen && onOpen) {
      const { onOpen } = this;
      delete this.onOpen;
      setTimeout(onOpen, 0);
    }
    models.load('models/elevator.glb')
      .then((model) => {
        model.updateMatrixWorld();
        model.traverse((child) => {
          if (child.isMesh) {
            this.bounds.expandByObject(child);
            this.translocables.push(child);
          }
        });
        this.add(model);
      });
    models.load('models/elevatorDoor.glb')
      .then((model) => {
        this.doors = [
          { open: -2.75, closed: -1 },
          { open: 2.75, closed: 1 },
        ].map((animation) => {
          const door = model.clone();
          door.animation = animation;
          door.position.set(animation[isOpen ? 'open' : 'closed'], 0, -0.75);
          door.scale.set(1, 1, 0.5);
          door.traverse((child) => {
            if (child.isMesh) {
              this.translocables.push(child);
            }
          });
          this.add(door);
          return door;
        });
      });
    sfx.load('sounds/ding.ogg')
      .then((sound) => {
        const filter = sound.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 256;
        sound.setFilter(filter);
        this.add(sound);
        this.sound = sound;
      });
  }

  animate(delta) {
    const { doors, isOpen, sound } = this;
    if (!doors) {
      return;
    }
    doors.forEach(({ animation, position }) => {
      let diff;
      if (isOpen && position.x !== animation.open) {
        diff = animation.open - position.x;
      }
      if (!isOpen && position.x !== animation.closed) {
        diff = animation.closed - position.x;
      }
      if (diff) {
        const step = delta * 2;
        position.x += Math.min(Math.max(diff, -step), step);
      } else if (this.onClose && !isOpen) {
        const { onClose } = this;
        delete this.onClose;
        setTimeout(onClose, 0);
      } if (this.onOpen && isOpen) {
        const { onOpen } = this;
        delete this.onOpen;
        setTimeout(onOpen, 0);
        if (sound && sound.context.state === 'running') {
          sound.play();
        }
      }
    });
  }

  containsPoint(point) {
    const { aux, bounds, matrixWorld } = this;
    aux.copy(bounds).applyMatrix4(matrixWorld);
    return aux.containsPoint(point);
  }

  getOffset(player) {
    return {
      position: this.worldToLocal(new Vector3(
        player.head.position.x,
        player.position.y,
        player.head.position.z
      )),
      rotation: this.rotation.y,
    };
  }
}

export default Elevator;
