import {
  Box3,
  Color,
  Group,
  Matrix4,
  Vector3,
} from './three.js';
import Peers from './peers.js';
import Birds from '../renderables/birds.js';
import Button from '../renderables/button.js';
import Clouds from '../renderables/clouds.js';
import Counter from '../renderables/counter.js';
import Effect from '../renderables/effect.js';
import Elevator from '../renderables/elevator.js';
import Explosion from '../renderables/explosion.js';
import Ground from '../renderables/ground.js';
import Platforms from '../renderables/platforms.js';
import Pickups from '../renderables/pickups.js';
import Rocket from '../renderables/rocket.js';
import Spheres from '../renderables/spheres.js';

class Gameplay extends Group {
  constructor({
    climbablesPhysics = false,
    elevators,
    defaultAmmo = 10,
    groundColor = 0,
    platforms = false,
    pickups = false,
    rocketOrigin,
    rocketRotation = Math.PI,
    scene,
    offset,
    room,
    terrainPhysics = false,
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

    this.climbing = climbing;
    this.player = player;

    this.birds = new Birds({ anchor: player });
    this.add(this.birds);

    this.clouds = new Clouds();
    this.add(this.clouds);

    this.ammo = {
      counter: new Counter({
        icon: 'circle',
        value: defaultAmmo,
      }),
      use() {
        if (this.counter.value === 0) {
          return;
        }
        this.counter.set(this.counter.value - 1);
      },
      reload() {
        this.counter.set(defaultAmmo);
      },
    };
    ['left', 'right'].forEach((hand) => {
      const counter = this.ammo.counter.clone();
      counter.position.set(0.02 * (hand === 'left' ? -1 : 1), -0.1 / 3, 0.05);
      counter.rotation.set(0, Math.PI * 0.4 * (hand === 'left' ? -1 : 1), Math.PI * 0.5 * (hand === 'left' ? 1 : -1));
      player.attach(counter, hand);
    });

    this.effects = [
      {
        id: 'burning',
        color: 0xFF0000,
        onEnd: () => this.respawn(),
      },
      {
        id: 'suffocating',
        color: 0,
        onEnd: () => this.respawn(),
      },
    ].reduce((effects, {
      id,
      color,
      onEnd,
      onTrigger,
    }) => {
      const effect = new Effect({
        anchor: player.head,
        color,
        onEnd,
        onTrigger,
      });
      this.add(effect);
      effects[id] = effect;
      effects.list.push(effect);
      return effects;
    }, { list: [] });

    this.explosions = [...Array(50)].map(() => {
      const explosion = new Explosion({ sfx });
      this.add(explosion);
      return explosion;
    });

    const ground = new Ground(256, 256, groundColor);
    this.add(ground);

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

    const rocket = new Rocket({
      models,
      position: rocketOrigin,
      rotation: rocketRotation,
      onAnimation: ({ step, tick }) => {
        if (rocket.movePlayer) {
          player.move(vector.set(0, step, 0));
        }
        if (tick) {
          vector
            .set((Math.random() - 0.5) * 2, (Math.random() - 0.5), (Math.random() - 0.5) * 2)
            .normalize()
            .multiplyScalar(24);
          vector.y += 30;
          this.spawnExplosion(
            vector,
            color.setRGB(Math.random(), Math.random(), Math.random()),
            0.5 + Math.random()
          );
        }
      },
      onTrigger: () => {
        rocket.movePlayer = rocket.bounds.containsPoint(player.head.position);
        this.physics.removeConstraint(button.constraint);
        this.physics.removeMesh(button);
        rocket.worldToLocal(button.position.copy(button.initialPosition));
        button.rotation.set(0, 0, 0);
        rocket.add(button);
      },
      onReset: () => {
        button.position.copy(button.initialPosition);
        button.rotation.y = button.initialRotation;
        this.add(button);
        this.physics.addMesh(button, 1);
        button.constraint = this.physics.addConstraint(button, button.slider);
        for (let i = 0; i < this.spheres.count; i += 1) {
          this.physics.setMeshPosition(
            this.spheres,
            vector.set(0, 0.2, -1000 - i),
            i,
            false
          );
        }
        this.respawn();
      },
    });
    this.add(rocket);
    this.rocket = rocket;

    const button = new Button({
      position: rocket.localToWorld(new Vector3(0, 2, -0.6)),
      rotation: rocket.rotation.y,
    });
    button.trigger.onContact = ({ mesh }) => {
      if (rocket.enabled || mesh !== button) {
        return;
      }
      rocket.trigger();
      this.peers.broadcast(new Uint8Array(1));
    };
    this.add(button);

    scene.getPhysics()
      .then((physics) => {
        this.physics = physics;

        this.physics.addMesh(button, 1);
        button.constraint = this.physics.addConstraint(button, button.slider);
        this.physics.addMesh(button.trigger, 0, { isTrigger: true });

        this.physics.addMesh(ground);

        this.sphere = 0;
        this.spheres = new Spheres({
          count: 50,
          sfx,
          sound: 'sounds/shot.ogg',
        });
        this.spheres.destroyOnContact = ({ mesh, index, point }) => {
          if (mesh !== this.spheres) {
            return;
          }
          this.spawnExplosion(point, this.spheres.getColorAt(index, color));
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
        const matrix = new Matrix4();
        for (let i = 0; i < this.spheres.count; i += 1) {
          matrix.setPosition(0, 0.2, -1000 - i);
          this.spheres.setMatrixAt(i, matrix);
        }
        this.physics.addMesh(this.spheres, 1, { isSleeping: true });
        this.add(this.spheres);

        this.peers = new Peers({
          onJoin: (peer) => {
            peer.head.onContact = this.spheres.destroyOnContact;
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
              const [id] = new Uint8Array(buffer);
              if (id === 0) {
                rocket.trigger();
              } else if (this.pickups) {
                this.pickups.pickByIndex(id - 1);
              }
            } else if (buffer.byteLength === 24) {
              const [x, y, z, ix, iy, iz] = new Float32Array(buffer);
              this.spawnSphere({ x, y, z }, { x: ix, y: iy, z: iz });
            }
          },
          player,
          room: `wss://rooms.trolltower.app/${room}`,
        });
        this.add(this.peers);

        player.head.physics.onContact = this.spheres.destroyOnContact;
        this.physics.addMesh(player.head.physics, 0, { isKinematic: true, isTrigger: true });

        player.controllers.forEach((controller) => {
          this.physics.addMesh(controller.physics, 0, { isKinematic: true });
        });
      });

    if (platforms) {
      Promise.all([
        scene.getPhysics(),
        models.load(platforms.model),
      ])
        .then(([/* physics */, { children: [{ children: [model] }] }]) => {
          this.platforms = new Platforms({
            instances: platforms.instances,
            model,
            onMovement: () => {
              const grip = climbing.grip
                .map((grip, hand) => ({ ...(grip || {}), hand }))
                .filter(({ mesh }) => (mesh))
                .sort(({ time: a }, { time: b }) => (b - a));
              if (!grip.length) {
                return;
              }
              if (
                grip.length > 1
                && (grip[0].mesh === this.platforms || grip[1].mesh === this.platforms)
                && (grip[0].mesh !== grip[1].mesh || grip[0].index !== grip[1].index)
              ) {
                climbing.grip[grip[1].hand] = false;
              }
              if (grip[0].mesh === this.platforms) {
                player.move(vector.copy(this.platforms.getMovement(grip[0].index)).negate());
              }
            },
          });
          climbables.push(this.platforms);
          this.add(this.platforms);
          this.physics.addMesh(this.platforms, 0, { isKinematic: true });
        });
    }

    if (pickups) {
      models.load(pickups.model)
        .then(({ children: [{ children: [model] }] }) => {
          this.pickups = new Pickups({
            instances: pickups.instances,
            model,
            onPick: ({ position, index }, isRemote) => {
              this.spawnExplosion(
                position,
                color.setRGB(Math.random(), Math.random(), Math.random())
              );
              if (!isRemote) {
                this.ammo.reload();
                this.peers.broadcast(new Uint8Array([index + 1]));
              }
            },
          });
          this.add(this.pickups);
        });
    }

    const suffocables = [];
    const head = new Box3();
    this.isInsideGeometry = () => {
      head.setFromObject(player.head.physics);
      return suffocables.find((mesh) => {
        if (!mesh.collision || mesh.collisionAutoUpdate) {
          mesh.collision = (mesh.collision || new Box3()).setFromObject(mesh);
        }
        return mesh.collision.intersectsBox(head);
      });
    };

    Promise.all([
      scene.getPhysics(),
      climbablesPhysics ? models.physics(climbablesPhysics, 0.5) : Promise.resolve(),
      models.physics('models/rocketPhysics.json', 0.25),
      terrainPhysics ? models.physics(terrainPhysics, 0.5) : Promise.resolve(),
    ])
      .then(([/* physics */, climbablesPhysics, rocketPhysics, terrainPhysics]) => {
        translocables.push(ground);
        if (climbablesPhysics) {
          climbablesPhysics.forEach((box) => {
            climbables.push(box);
            suffocables.push(box);
            translocables.push(box);
            this.physics.addMesh(box);
            this.add(box);
          });
        }
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
      });

    this.syncTimeOffset = () => setTimeout(() => scene.syncTimeOffset('https://rooms.trolltower.app/'), 0);
    this.syncTimeOffset();
  }

  onAnimationTick(animation) {
    const {
      ammo,
      birds,
      clouds,
      effects,
      elevators,
      explosions,
      peers,
      physics,
      platforms,
      pickups,
      player,
      rocket,
    } = this;
    birds.animate(animation);
    clouds.animate(animation);
    effects.list.forEach((effect) => effect.animate(animation));
    explosions.forEach((explosion) => explosion.animate(animation));
    if (peers) {
      peers.animate(animation);
    }
    if (platforms) {
      platforms.animate(animation);
    }
    if (pickups) {
      pickups.animate(animation);
      player.controllers.forEach(({ hand, worldspace }) => {
        if (hand) {
          pickups.pickAtPoint(worldspace.position);
        }
      });
    }
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
    if (this.isInsideGeometry()) {
      effects.suffocating.trigger();
      player.controllers.forEach((controller) => {
        if (controller.hand) {
          controller.pulse(0.6, 10);
        }
      });
    } else if (effects.suffocating.visible) {
      effects.suffocating.reset();
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
      if (
        ammo.counter.value > 0
        && (
          (hand && buttons.triggerDown)
          || (isDesktop && buttons.primaryDown)
        )
      ) {
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
        ammo.use();
      }
    });
  }

  respawn() {
    const {
      ammo,
      climbing,
      effects,
      elevators,
      player,
    } = this;
    ammo.reload();
    climbing.grip[0] = false;
    climbing.grip[1] = false;
    climbing.isFalling = false;
    effects.list.forEach((effect) => effect.reset());
    const elevator = elevators[Math.floor(Math.random() * elevators.length)];
    player.teleport(elevator.localToWorld(new Vector3(0, 2, -7)));
    player.rotate(elevator.rotation.y - Math.PI - player.head.rotation.y);
    this.spawn = elevator;
    this.syncTimeOffset();
  }

  spawnExplosion(position, color, scale = 0.5) {
    const { explosions } = this;
    const explosion = explosions.find(({ sound, visible }) => (
      !visible && (!sound || !sound.isPlaying)
    ));
    if (explosion) {
      explosion.detonate({
        color,
        filter: 'highpass',
        position,
        scale,
      });
    }
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
    spheres.playSound(position);
  }

  onUnload() {
    const {
      ammo,
      birds,
      peers,
      platforms,
      pickups,
    } = this;
    ammo.counter.dispose();
    birds.dispose();
    peers.disconnect();
    if (platforms) {
      platforms.dispose();
    }
    if (pickups) {
      pickups.dispose();
    }
  }
}

export default Gameplay;
