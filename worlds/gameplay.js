import {
  Box3,
  Color,
  Group,
  Matrix4,
  Vector3,
} from '../core/three.js';
import Peers from '../core/peers.js';
import Birds from '../renderables/birds.js';
import Button from '../renderables/button.js';
import Clouds from '../renderables/clouds.js';
import Elevator from '../renderables/elevator.js';
import Explosion from '../renderables/explosion.js';
import Ground from '../renderables/ground.js';
import Platforms from '../renderables/platforms.js';
import Spheres from '../renderables/spheres.js';

class Gameplay extends Group {
  constructor({
    elevators,
    groundColor,
    platforms = [],
    rocketOrigin,
    rocketRotation,
    scene,
    offset,
    room,
    terrainPhysics,
    towerPhysics,
  }) {
    super();

    const {
      climbables,
      climbing,
      models,
      player,
      sfx,
      translocables,
    } = scene;

    scene.syncTimeOffset('https://rooms.trolltower.app/');

    this.birds = new Birds({ anchor: player });
    this.add(this.birds);

    this.clouds = new Clouds();
    this.add(this.clouds);

    const explosions = [...Array(50)].map(() => {
      const explosion = new Explosion({ sfx });
      this.add(explosion);
      return explosion;
    });
    this.explosions = explosions;

    const ground = new Ground(256, 256, groundColor);
    this.add(ground);

    this.platforms = new Platforms({
      onMovement: () => {
        climbing.grip.forEach((grip) => {
          if (!grip || grip.mesh !== this.platforms) {
            return;
          }
          delete player.destination;
          player.move(this.platforms.getMovement(grip.index));
        });
      },
      platforms,
    });
    climbables.push(this.platforms);
    this.add(this.platforms);

    this.player = player;

    const spawn = Math.floor(Math.random() * elevators.length);
    elevators = elevators.map(({ position, rotation }, i) => {
      const elevator = new Elevator({
        isOpen: i !== spawn,
        models,
        sfx,
        onOpen: () => {
          elevator.onClose = () => (
            scene.load('Menu', { offset: elevator.getOffset(player), room })
          );
        },
      });
      elevator.position.copy(position);
      elevator.rotation.y = rotation;
      elevator.scale.setScalar(0.25);
      elevator.updateMatrixWorld();
      translocables.push(elevator.translocables);
      this.add(elevator);
      return elevator;
    });
    this.elevators = elevators;
    this.spawn = elevators[spawn];

    {
      const origin = new Vector3();
      const elevator = elevators[spawn];
      if (offset) {
        elevator.localToWorld(origin.copy(offset.position));
        player.teleport(origin);
        player.rotate(elevator.rotation.y - offset.rotation);
      } else {
        elevator.localToWorld(origin.set(0, 2, -7));
        player.teleport(origin);
        player.rotate(elevator.rotation.y - Math.PI - player.head.rotation.y);
      }
    }

    const color = new Color();
    const vector = new Vector3();

    const rocket = new Group();
    rocket.position.copy(rocketOrigin);
    rocket.initialPosition = rocket.position.clone();
    rocket.rotation.set(0, rocketRotation, 0);
    rocket.updateMatrixWorld();
    rocket.bounds = (
      new Box3(new Vector3(-0.75, 0, -0.75), new Vector3(0.75, 4, 0.75))
    ).applyMatrix4(rocket.matrixWorld);
    this.add(rocket);
    this.rocket = rocket;

    rocket.animate = ({ delta }) => {
      if (!rocket.enabled) {
        return;
      }
      const step = rocket.speed * delta;
      rocket.speed += delta * 5;
      rocket.position.y += step;
      if (rocket.movePlayer) {
        delete player.destination;
        player.move(vector.set(0, step, 0));
      }
      rocket.tick -= delta;
      if (rocket.tick <= 0) {
        rocket.tick = 0.05 + Math.random() * 0.05;
        const explosion = explosions.find(({ sound, visible }) => (
          !visible && (!sound || !sound.isPlaying)
        ));
        if (explosion) {
          vector
            .set((Math.random() - 0.5) * 2, (Math.random() - 0.5), (Math.random() - 0.5) * 2)
            .normalize()
            .multiplyScalar(24);
          vector.y += 30;
          explosion.detonate({
            color: color.setRGB(Math.random(), Math.random(), Math.random()),
            filter: 'highpass',
            position: vector,
            scale: 0.5 + Math.random(),
          });
        }
      }
      rocket.timer -= delta;
      if (rocket.timer <= 0) {
        rocket.reset();
      }
    };

    const button = new Button({
      position: rocket.localToWorld(new Vector3(0, 2, -0.6)),
      rotation: rocketRotation,
    });
    button.trigger.onContact = ({ mesh }) => {
      if (rocket.enabled || mesh !== button) {
        return;
      }
      rocket.trigger();
      this.peers.broadcast(new Uint8Array([0x01]));
    };
    this.add(button);

    rocket.trigger = () => {
      if (rocket.enabled) {
        return;
      }
      rocket.enabled = true;
      rocket.movePlayer = rocket.bounds.containsPoint(player.head.position);
      rocket.speed = 0;
      rocket.tick = 0;
      rocket.timer = 10;

      this.physics.removeConstraint(button.constraint);
      this.physics.removeMesh(button);
      rocket.worldToLocal(button.position.copy(button.initialPosition));
      button.rotation.set(0, 0, 0);
      rocket.add(button);
    };
    rocket.reset = () => {
      rocket.enabled = false;
      rocket.position.copy(rocket.initialPosition);
      rocket.updateMatrixWorld();
      button.position.copy(button.initialPosition);
      button.rotation.y = button.initialRotation;
      this.add(button);
      this.physics.addMesh(button, 1);
      button.constraint = this.physics.addConstraint(button, button.slider);
      for (let i = 0; i < this.spheres.count; i += 1) {
        this.physics.setMeshPosition(
          this.spheres,
          new Vector3(0, 0.2, -1000 - i),
          i,
          false
        );
      }
      this.respawn();
    };

    const onContact = ({ mesh, index, point }) => {
      if (mesh !== this.spheres) {
        return;
      }
      const explosion = explosions.find(({ sound, visible }) => (
        !visible && (!sound || !sound.isPlaying)
      ));
      if (explosion) {
        explosion.detonate({
          color: this.spheres.getColorAt(index, color),
          filter: 'highpass',
          position: point,
          scale: 0.5,
        });
      }
      this.physics.setMeshPosition(
        this.spheres,
        vector.set(0, 0.2, -1000 - index),
        index,
        false
      );
      if (
        !climbing.isFalling && !player.destination && player.head.position.distanceTo(point) < 1
      ) {
        climbing.grip[0] = false;
        climbing.grip[1] = false;
        climbing.isFalling = true;
        climbing.fallSpeed = 0;
      }
    };

    models.load('models/rocket.glb')
      .then((model) => {
        model.scale.setScalar(0.25);
        rocket.add(model);
      });

    Promise.all([
      scene.getPhysics()
        .then((physics) => {
          this.physics = physics;
          this.peers = new Peers({
            onJoin: (peer) => {
              peer.head.onContact = onContact;
              this.physics.addMesh(peer.head, 0, { isKinematic: true, isTrigger: true });
            },
            onLeave: (peer) => {
              this.physics.removeMesh(peer.head);
            },
            onPeerMessage: ({ message: { buffer } }) => {
              if (!buffer) {
                return;
              }
              if (buffer.byteLength === 1) {
                rocket.trigger();
              } else if (buffer.byteLength === 24) {
                const [x, y, z, ix, iy, iz] = new Float32Array(buffer);
                this.spawnSphere({ x, y, z }, { x: ix, y: iy, z: iz });
              }
            },
            player,
            room: `wss://rooms.trolltower.app/${room}`,
          });
          this.add(this.peers);

          player.head.physics.onContact = onContact;
          this.physics.addMesh(player.head.physics, 0, { isKinematic: true, isTrigger: true });

          player.controllers.forEach((controller) => {
            this.physics.addMesh(controller.physics, 0, { isKinematic: true });
          });

          this.physics.addMesh(ground);

          this.physics.addMesh(button, 1);
          button.constraint = this.physics.addConstraint(button, button.slider);
          this.physics.addMesh(button.trigger, 0, { isTrigger: true });

          this.sphere = 0;
          this.spheres = new Spheres({ count: 50 });
          const matrix = new Matrix4();
          for (let i = 0; i < this.spheres.count; i += 1) {
            matrix.setPosition(0, 0.2, -1000 - i);
            this.spheres.setMatrixAt(i, matrix);
          }
          this.physics.addMesh(this.spheres, 1, { isSleeping: true });
          this.add(this.spheres);
        }),
      models.physics('models/rocketPhysics.json', 0.25),
      terrainPhysics ? models.physics(terrainPhysics, 0.5) : Promise.resolve(),
      towerPhysics ? models.physics(towerPhysics, 0.5) : Promise.resolve(),
    ])
      .then(([/* physics */, rocketPhysics, terrainPhysics, towerPhysics]) => {
        translocables.push(ground);
        rocket.physics = [];
        rocketPhysics.forEach((box) => {
          translocables.push(box);
          rocket.add(box);
          rocket.physics.push({
            shape: 'box',
            position: box.position,
            width: box.geometry.parameters.width,
            height: box.geometry.parameters.height,
            depth: box.geometry.parameters.depth,
          });
        });
        this.physics.addMesh(rocket, 0, { isKinematic: true });
        if (terrainPhysics) {
          terrainPhysics.forEach((box) => {
            translocables.push(box);
            this.physics.addMesh(box);
            this.add(box);
          });
        }
        if (towerPhysics) {
          towerPhysics.forEach((box) => {
            climbables.push(box);
            translocables.push(box);
            this.physics.addMesh(box);
            this.add(box);
          });
        }
      });
  }

  onAnimationTick(animation) {
    const {
      birds,
      elevators,
      clouds,
      explosions,
      peers,
      physics,
      platforms,
      player,
      rocket,
    } = this;
    birds.animate(animation);
    clouds.animate(animation);
    explosions.forEach((explosion) => explosion.animate(animation));
    if (peers) {
      peers.animate(animation);
    }
    platforms.animate(animation);
    rocket.animate(animation);
    let isOnElevator = false;
    elevators.forEach((elevator) => {
      elevator.animate(animation);
      if (
        !isOnElevator
        && elevator.containsPoint(player.head.position)
      ) {
        isOnElevator = true;
        if (
          elevator.isOpen
          && (
            player.desktopControls.buttons.primaryDown
            || player.controllers.find(
              ({ hand, buttons: { triggerDown } }) => (hand && triggerDown)
            )
          )
        ) {
          elevator.isOpen = false;
        }
      }
    });
    if (!physics || isOnElevator) {
      return;
    }
    [
      player.desktopControls,
      ...player.controllers,
    ].forEach(({
      buttons,
      hand,
      isDesktop,
      raycaster,
    }) => {
      if ((hand && buttons.triggerDown) || (isDesktop && buttons.primaryDown)) {
        const { origin, direction } = raycaster.ray;
        const position = origin
          .clone()
          .addScaledVector(direction, 0.5);
        const impulse = direction.clone().multiplyScalar(16);
        this.spawnSphere(position, impulse);
        peers.broadcast(new Uint8Array(new Float32Array([
          position.x, position.y, position.z,
          impulse.x, impulse.y, impulse.z,
        ]).buffer));
      }
    });
  }

  respawn() {
    const { elevators, player } = this;
    const elevator = elevators[Math.floor(Math.random() * elevators.length)];
    player.teleport(elevator.localToWorld(new Vector3(0, 2, -7)));
    player.rotate(elevator.rotation.y - Math.PI - player.head.rotation.y);
    this.spawn = elevator;
  }

  spawnSphere(position, impulse) {
    const { physics, sphere, spheres } = this;
    if (!this.physics) {
      return;
    }
    this.sphere = (this.sphere + 1) % spheres.count;
    physics.setMeshPosition(
      spheres,
      position,
      sphere
    );
    physics.applyImpulse(spheres, impulse, sphere);
  }

  onUnload() {
    const { birds, peers } = this;
    birds.dispose();
    peers.disconnect();
  }
}

export default Gameplay;
