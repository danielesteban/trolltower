import { Group, Vector3 } from '../core/three.js';
import Peers from '../core/peers.js';
import Controls from '../renderables/controls.js';
import Display from '../renderables/display.js';
import Elevator from '../renderables/elevator.js';
import Title from '../renderables/title.js';

class Menu extends Group {
  constructor(scene, { offset, room }) {
    super();

    const { models, player, sfx, translocables } = scene;
    this.player = player;

    this.add(new Controls());
    this.add(new Title());

    this.elevators = [...Array(4)].map((v, i) => {
      const elevator = new Elevator({
        isOpen: !offset || room !== (i + 1),
        models,
        sfx,
        onOpen: () => {
          elevator.onClose = () => (
            scene.load('Tower', { offset: elevator.getOffset(player), room: i + 1 })
          );
        },
      });
      elevator.position.set(7.75, 0, -4.5 + i * 3);
      elevator.rotation.y = Math.PI * -0.5;
      elevator.scale.setScalar(0.25);
      elevator.display = new Display({ width: 128, height: 32 });
      elevator.display.position.set(0, 13, 0.125);
      elevator.add(elevator.display);
      elevator.updateMatrixWorld();
      translocables.push(elevator.translocables);
      this.add(elevator);
      return elevator;
    });

    const updateDisplays = () => (
      fetch('https://rooms.trolltower.app/peers')
        .then((res) => res.json())
        .then((rooms) => {
          this.elevators.forEach((elevator, i) => {
            elevator.display.set(`SERVER 0${i + 1} - PLAYERS ${rooms[i + 1] || 0}/16`);
          });
        })
    );

    this.updateDisplaysInterval = setInterval(updateDisplays, 10000);
    updateDisplays();

    const origin = new Vector3(0, 0.5, 0);
    if (offset) {
      const elevator = this.elevators[room - 1];
      elevator.localToWorld(origin.copy(offset.position));
      player.teleport(origin);
      player.rotate(elevator.rotation.y - offset.rotation);
    } else {
      player.rotation.y = 0;
      player.teleport(origin);
    }

    this.peers = new Peers({
      player,
      room: 'wss://rooms.trolltower.app/Menu',
    });
    this.add(this.peers);

    models.load('models/menu.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
        model.traverse((child) => {
          if (child.isMesh) {
            translocables.push(child);
          }
        });

        if (offset) {
          this.elevators[room - 1].isOpen = true;
        }
      });
  }

  onAnimationTick(animation) {
    const {
      elevators,
      peers,
      player,
    } = this;
    peers.animate(animation);
    elevators.forEach((elevator) => {
      elevator.animate(animation);
      if (
        elevator.isOpen
        && elevator.containsPoint(player.head.position)
        && (
          player.desktopControls.buttons.primaryDown
          || player.controllers.find(({ hand, buttons: { triggerDown } }) => (hand && triggerDown))
        )
      ) {
        elevator.isOpen = false;
      }
    });
  }

  onUnload() {
    const { elevators, peers, updateDisplaysInterval } = this;
    elevators.forEach((elevator) => elevator.display.dispose());
    peers.disconnect();
    clearInterval(updateDisplaysInterval);
  }
}

export default Menu;
