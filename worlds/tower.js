import {
  Box3,
  Color,
  Euler,
  FogExp2,
  Group,
  Matrix4,
  Vector3,
} from '../core/three.js';
import ElevatorWorld from '../core/elevatorWorld.js';
import Peers from '../core/peers.js';
import Birds from '../renderables/birds.js';
import Button from '../renderables/button.js';
import Clouds from '../renderables/clouds.js';
import Explosion from '../renderables/explosion.js';
import Ground from '../renderables/ground.js';
import Ocean from '../renderables/ocean.js';
import Spheres from '../renderables/spheres.js';

class Tower extends ElevatorWorld {
  constructor(scene, { offset, room }) {
    const boats = [
      new Vector3(-17.5, 3.5, -21),
      new Vector3(21, 3.5, -21),
    ].map((position) => {
      const boat = new Group();
      boat.position.copy(position);
      boat.rotation.order = 'YXZ';
      boat.lookAt(0, position.y, 0);
      boat.rotateY(Math.PI);
      boat.updateMatrixWorld();
      return boat;
    });
    const boatModelOffset = new Vector3(-4, -3, 0);
    const boat = boats[Math.floor(Math.random() * boats.length)];

    super({
      scene,
      room,
      offset,
      position: boat.localToWorld(new Vector3(0, -0.5, 4.25)),
      rotation: new Euler(0, boat.rotation.y - Math.PI, 0),
    });

    const { ambient, climbables, climbing, models, player, sfx, translocables } = scene;
    ambient.set('sounds/sea.ogg');
    scene.background = new Color(0x336688);
    scene.fog = new FogExp2(scene.background.getHex(), 0.02);

    this.birds = new Birds({ anchor: player });
    this.add(this.birds);

    this.clouds = new Clouds();
    this.add(this.clouds);

    const ground = new Ground(256, 256, 0x05bb7c);
    this.add(ground);

    const ocean = new Ocean();
    ocean.position.y = 1.675;
    this.add(ocean);

    const explosions = [...Array(50)].map(() => {
      const explosion = new Explosion({ sfx });
      this.add(explosion);
      return explosion;
    });
    this.explosions = explosions;

    const color = new Color();
    const vector = new Vector3();

    const rocket = new Group();
    rocket.position.set(0, 31.25, 0);
    rocket.initialPosition = rocket.position.clone();
    rocket.rotation.set(0, Math.PI, 0);
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

    const button = new Button({ position: new Vector3(0, 33.25, 0.625) });
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
      this.add(button);
      this.physics.addMesh(button, 1);
      button.constraint = this.physics.addConstraint(button, button.slider);
      const origin = new Vector3(0, 2, -7);
      this.elevator.localToWorld(origin);
      player.teleport(origin);
      player.rotate(this.elevator.rotation.y - Math.PI - player.head.rotation.y);
      for (let i = 0; i < this.spheres.count; i += 1) {
        this.physics.setMeshPosition(
          this.spheres,
          new Vector3(0, 0.2, -1000 - i),
          i,
          false
        );
      }
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
        climbing.hands[0] = false;
        climbing.hands[1] = false;
        climbing.isFalling = true;
        climbing.fallSpeed = 0;
      }
    };

    Promise.all([
      models.load('models/boat.glb')
        .then((model) => {
          model.position.copy(boatModelOffset);
          model.scale.setScalar(0.5);
          boats.forEach((boat) => {
            boat.add(model.clone());
            this.add(boat);
          });
        }),
      models.load('models/tower.glb')
        .then((model) => {
          model.scale.setScalar(0.5);
          model.traverse((child) => {
            if (child.isMesh && child.material.transparent) {
              child.material.alphaTest = 1;
              child.material.depthWrite = true;
              child.material.transparent = false;
            }
          });
          this.add(model);
        }),
    ])
      .then(() => {
        this.elevator.isOpen = true;
      });

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
          this.physics.addMesh(button.trigger, 0, { isTrigger: true });
          button.constraint = this.physics.addConstraint(button, button.slider);

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
      models.physics('models/boatPhysics.json', 0.5),
      models.physics('models/towerIslandPhysics.json', 0.5),
      models.physics('models/rocketPhysics.json', 0.25),
      models.physics('models/towerPhysics.json', 0.5),
    ])
      .then(([/* physics */, boatPhysics, islandPhysics, rocketPhysics, towerPhysics]) => {
        translocables.push(ground);
        boats.forEach((boat) => {
          boat.physics = [];
          boatPhysics.forEach((box) => {
            box = box.clone();
            box.position.add(boatModelOffset);
            translocables.push(box);
            boat.add(box);
            boat.physics.push({
              shape: 'box',
              position: box.position,
              width: box.geometry.parameters.width,
              height: box.geometry.parameters.height,
              depth: box.geometry.parameters.depth,
            });
          });
          this.physics.addMesh(boat);
        });
        islandPhysics.forEach((box) => {
          translocables.push(box);
          this.physics.addMesh(box);
          this.add(box);
        });
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
        towerPhysics.forEach((box) => {
          box.isTower = true;
          climbables.push(box);
          translocables.push(box);
          this.physics.addMesh(box);
          this.add(box);
        });
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const {
      birds,
      clouds,
      explosions,
      isOnElevator,
      peers,
      physics,
      player,
      rocket,
    } = this;
    birds.animate(animation);
    clouds.animate(animation);
    explosions.forEach((explosion) => explosion.animate(animation));
    Ocean.animate(animation);
    if (peers) {
      peers.animate(animation);
    }
    rocket.animate(animation);
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

Tower.display = 'Troll Tower';
Tower.isMultiplayer = true;

export default Tower;
