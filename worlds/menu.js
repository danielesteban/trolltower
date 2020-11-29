import { Group, Vector3 } from '../core/three.js';
import Peers from '../core/peers.js';
import Controls from '../renderables/controls.js';
import Display from '../renderables/display.js';
import Door from '../renderables/door.js';
import Skin from '../renderables/skin.js';
import Elevator from '../renderables/elevator.js';
import Sign from '../renderables/sign.js';
import Title from '../renderables/title.js';

class Menu extends Group {
  constructor(scene, { offset, room }) {
    super();

    const { ambient, models, player, sfx, pointables, translocables } = scene;
    ambient.set('sounds/room.ogg');
    this.player = player;

    this.add(new Controls());
    this.add(new Title());

    const alphatester = !!localStorage.getItem('alphatester');

    const elevators = [
      'Tower',
      'Well',
    ].map((world, i) => {
      const elevator = new Elevator({ models, sfx });
      elevator.world = world;
      elevator.position.set(7.75, 0, -1.5 + i * 3);
      elevator.rotation.y = Math.PI * -0.5;
      elevator.scale.setScalar(0.25);
      elevator.display = new Display({ width: 128, height: 32 });
      elevator.display.position.set(0, 13, 0.125);
      elevator.add(elevator.display);
      elevator.updateMatrixWorld();
      translocables.push(elevator.translocables);
      this.add(elevator);
      if (!alphatester && world === 'Well') {
        elevator.display.set(`The ${elevator.world} - COMING SOON`);
        elevator.add(new Sign());
      }
      return elevator;
    });
    this.elevators = elevators;

    const updateElevators = () => (
      fetch('https://rooms.trolltower.app/peers')
        .then((res) => res.json())
        .then((rooms) => (
          elevators.forEach((elevator, i) => {
            if (!alphatester && elevator.world === 'Well') {
              return;
            }
            const maxPeers = 16;
            let instance = 0;
            let peers;
            while (true) { // eslint-disable-line no-constant-condition
              instance += 1;
              peers = rooms[`${elevator.world}-${instance}`] || 0;
              if (peers < maxPeers) {
                break;
              }
            }
            elevator.display.set(`The ${elevator.world} - S${i < 9 ? '0' : ''}${instance} - ${peers}/${maxPeers}`);
            elevator.isOpen = peers < maxPeers;
            elevator.onClose = elevator.isOpen ? () => (
              scene.load(elevator.world, { offset: elevator.getOffset(player), instance })
            ) : undefined;
          })
        ))
    );

    this.updateElevatorsInterval = setInterval(updateElevators, 10000);
    updateElevators();

    const origin = new Vector3(0, 0.5, 0);
    if (offset) {
      const [world] = room.split('-');
      const elevator = elevators.find(({ world: id }) => world === id);
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

    const doors = [...Array(2)].map((v, i) => {
      const orientation = i === 0 ? 1 : -1;
      const door = new Door({
        limits: i === 0 ? { low: -Math.PI, high: 0 } : { low: 0, high: Math.PI },
        model: 'models/menuDoor.glb',
        models,
        orientation,
      });
      door.position.set(0.5 * -orientation, 1.75, 7.5);
      translocables.push(door.translocables);
      this.add(door);
      return door;
    });

    const skin = new Skin(player.skin);
    skin.position.set(0, 1.5, 13);
    pointables.push(skin.pointables);
    this.add(skin);
    this.skin = skin;

    models.load('models/menu.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
      });

    Promise.all([
      scene.getPhysics(),
      models.physics('models/menuPhysics.json', 0.5),
    ])
      .then(([physics, boxes]) => {
        this.physics = physics;
        boxes.forEach((box) => {
          translocables.push(box);
          this.physics.addMesh(box);
          this.add(box);
        });
        doors.forEach((door) => {
          this.physics.addMesh(door, 5);
          this.physics.addConstraint(door, door.hinge);
        });
        player.controllers.forEach((controller) => {
          this.physics.addMesh(controller.physics, 0, { isKinematic: true, isTrigger: true });
        });
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
    player.controllers.forEach(({ buttons, hand, pointer }) => {
      if (
        hand
        && pointer
        && pointer.visible
        && (buttons.gripDown || buttons.primaryDown || buttons.triggerDown)
      ) {
        pointer.target.object.onPointer({
          buttons,
          point: pointer.target.point,
          uv: pointer.target.uv,
        });
      }
    });
  }

  onUnload() {
    const {
      elevators,
      peers,
      skin,
      updateElevatorsInterval,
    } = this;
    elevators.forEach((elevator) => elevator.display.dispose());
    peers.disconnect();
    skin.dispose();
    clearInterval(updateElevatorsInterval);
  }
}

export default Menu;
