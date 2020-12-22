import { Group, Vector3 } from '../core/three.js';
import Peers from '../core/peers.js';
import Controls from '../renderables/controls.js';
import Display from '../renderables/display.js';
import Door from '../renderables/door.js';
import Sign from '../renderables/sign.js';
import Skin from '../renderables/skin.js';
import Elevator from '../renderables/elevator.js';
import Platforms from '../renderables/platforms.js';
import PrivateServer from '../renderables/privateServer.js';
import Sponsors from '../renderables/sponsors.js';
import Title from '../renderables/title.js';

class Menu extends Group {
  constructor(scene, { offset, room }) {
    super();

    const { ambient, models, player, sfx, pointables, translocables } = scene;
    ambient.set('sounds/room.ogg');
    this.player = player;

    this.add(new Controls());
    this.add(new PrivateServer());
    this.add(new Title());

    this.elevators = [
      'Tower',
      'Well',
      'Brittle',
      'Coming Soon',
      'Coming Soon',
      'Coming Soon',
    ].reduce((elevators, id, i) => {
      let world;
      if (scene.worlds[id]) {
        world = {
          id,
          ...scene.worlds[id].display,
        };
      }
      for (let j = 0; j < 2; j += 1) {
        const elevator = new Elevator({ models, sfx });
        elevator.world = world;
        elevator.position.set(
          13.75 + Math.floor(i / 2) * 3.5,
          Math.floor(i / 2) * 4,
          -5 + j * 3 + (i % 2 === 1 ? 7 : 0)
        );
        elevator.rotation.y = Math.PI * -0.5;
        elevator.scale.setScalar(0.25);
        elevator.display = new Display(world || { value: id });
        if (!world) {
          elevator.add(new Sign());
        }
        elevator.display.position.set(0, 13, 0.125);
        elevator.add(elevator.display);
        elevator.updateMatrixWorld();
        translocables.push(elevator.translocables);
        this.add(elevator);
        elevators.push(elevator);
      }
      return elevators;
    }, []);

    {
      const elevator = new Elevator({ models, sfx });
      elevator.position.set(
        -8.25,
        0,
        -5
      );
      elevator.rotation.y = Math.PI * 0.5;
      elevator.scale.setScalar(0.25);
      elevator.add(new Sign());
      elevator.updateMatrixWorld();
      translocables.push(elevator.translocables);
      this.add(elevator);
      this.elevators.push(elevator);
    }

    const origin = new Vector3(0, 0.5, 0);
    if (offset) {
      const [world] = room.split('-');
      const elevator = this.elevators.find((elevator) => (
        elevator.world && elevator.world.id === world
      ));
      elevator.localToWorld(origin.copy(offset.position));
      player.teleport(origin);
      player.rotate(elevator.rotation.y - offset.rotation);
    } else {
      player.rotation.y = 0;
      player.teleport(origin);
    }

    this.peers = new Peers({
      player,
      onJoin: () => (
        updateElevators()
      ),
      room: 'wss://rooms.trolltower.app/Menu',
    });
    this.add(this.peers);

    let updatingElevators;
    const updateElevators = () => {
      if (updatingElevators) {
        return;
      }
      fetch('https://rooms.trolltower.app/peers')
        .then((res) => res.json())
        .then((rooms) => {
          const map = new Map();
          this.elevators.forEach((elevator) => {
            if (!elevator.world) {
              return;
            }
            const maxPeers = 16;
            let instance = 0;
            let peers;
            while (true) { // eslint-disable-line no-constant-condition
              instance += 1;
              const key = `${elevator.world.id}-${instance}`;
              peers = rooms[key] || 0;
              if (
                !map.has(key)
                && (peers + Math.min(this.peers.peers.length, maxPeers - 1)) < maxPeers
              ) {
                map.set(key, true);
                break;
              }
            }
            elevator.display.set(`${elevator.world.name} - S${instance < 10 ? '0' : ''}${instance} - ${peers}/${maxPeers}`);
            elevator.isOpen = peers < maxPeers;
            elevator.onClose = elevator.isOpen ? () => (
              scene.load(elevator.world.id, {
                instance,
                offset: elevator.getOffset(player),
                spectator: !player.xr.enabled || !player.xr.isPresenting,
              })
            ) : undefined;
          });
        })
        .finally(() => {
          updatingElevators = false;
        });
    };

    this.updateElevatorsInterval = setInterval(updateElevators, 10000);
    updateElevators();

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

    const skin = new Skin({
      onSave: (texture) => {
        player.skin = texture;
        this.peers.peers.forEach(({ connection }) => {
          if (connection) {
            delete connection.hasSentSkin;
          }
        });
        localStorage.setItem('trolltower::skin', texture);
      },
      texture: player.skin,
    });
    skin.position.set(0, 1.5, 13);
    pointables.push(skin.pointables);
    this.add(skin);
    this.skin = skin;

    const sponsors = new Sponsors({
      player,
      server: 'https://rooms.trolltower.app',
    });
    pointables.push(sponsors.pointables);
    this.add(sponsors);
    this.sponsors = sponsors;

    models.load('models/menu.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        model.traverse((child) => {
          child.matrixAutoUpdate = false;
          child.updateMatrix();
        });
        this.add(model);
      });

    scene.getPhysics()
      .then((physics) => {
        this.physics = physics;
        doors.forEach((door) => {
          this.physics.addMesh(door, 5);
          this.physics.addConstraint(door, door.hinge);
        });
        this.physics.addMesh(player.head.physics, 0, { isKinematic: true });
        player.controllers.forEach((controller) => {
          this.physics.addMesh(controller.physics, 0, { isKinematic: true });
        });
      });

    Promise.all([
      scene.getPhysics(),
      models.physics('models/menuPhysics.json', 0.5),
    ])
      .then(([/* physics */, boxes]) => {
        boxes.forEach((box) => {
          translocables.push(box);
          this.physics.addMesh(box, 0, { isClimbable: true });
        });
      });

    Promise.all([
      scene.getPhysics(),
      models.load('models/platform.glb'),
    ])
      .then(([/* physics */, { children: [{ children: [model] }] }]) => {
        const floors = ((this.elevators.length - 1) / 4);
        const origin = new Vector3(10, 2.4, 0);
        const direction = new Vector3(
          floors * 3.5 - 2,
          floors * 4 - 2,
          0
        );
        this.platforms = new Platforms({
          instances: [...Array(2)].map((v, i) => ({
            origin: i === 0 ? (
              new Vector3(origin.x, origin.y, -6.99)
            ) : (
              new Vector3(origin.x, origin.y, 6.99).add(direction)
            ),
            direction: direction.clone().multiplyScalar(i === 0 ? 1 : -1),
            speed: 0.5,
          })),
          model,
        });
        this.add(this.platforms);
        this.physics.addMesh(this.platforms, 0, { isClimbable: true, isKinematic: true });
      });

    setTimeout(() => scene.syncTimeOffset('https://rooms.trolltower.app/'), 0);
  }

  onAnimationTick(animation) {
    const {
      elevators,
      peers,
      platforms,
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
    if (platforms) {
      platforms.animate(animation);
      const grip = player.climbing.grip
        .map((grip, hand) => ({ ...(grip || {}), hand }))
        .filter(({ mesh }) => (mesh))
        .sort(({ time: a }, { time: b }) => (b - a));
      if (grip.length) {
        if (
          grip.length > 1
          && (grip[0].mesh === platforms || grip[1].mesh === platforms)
          && (grip[0].mesh !== grip[1].mesh || grip[0].index !== grip[1].index)
        ) {
          player.climbing.grip[grip[1].hand] = false;
        }
        if (grip[0].mesh === platforms) {
          player.move(
            player.climbing.movement.copy(platforms.getMovement(grip[0].index)).negate()
          );
        }
      }
    }
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
      platforms,
      skin,
      sponsors,
      updateElevatorsInterval,
    } = this;
    elevators.forEach((elevator) => {
      if (elevator.display) {
        elevator.display.dispose();
      }
    });
    peers.disconnect();
    if (platforms) {
      platforms.dispose();
    }
    skin.dispose();
    sponsors.dispose();
    clearInterval(updateElevatorsInterval);
  }
}

export default Menu;
