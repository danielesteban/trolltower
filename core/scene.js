import { Scene as ThreeScene, Vector3 } from './three.js';
import Ambient from './ambient.js';
import { AmmoPhysics } from './ammo.js';
import CurveCast from './curvecast.js';
import Models from './models.js';
import Player from './player.js';
import SFX from './sfx.js';

// A VR scene base class

class Scene extends ThreeScene {
  constructor({
    renderer: {
      camera,
      clock,
      dom,
      renderer,
    },
    worlds,
  }) {
    super();

    this.climbing = {
      bodyScale: 1,
      enabled: true,
      grip: [false, false],
      hand: new Vector3(),
      isJumping: false,
      isOnAir: false,
      lastMovement: new Vector3(),
      movement: new Vector3(),
      normal: new Vector3(),
      velocity: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
      reset() {
        this.bodyScale = 1;
        this.enabled = true;
        this.grip[0] = false;
        this.grip[1] = false;
        this.isJumping = false;
        this.isOnAir = false;
      },
    };
    this.clock = clock;

    this.models = new Models();

    this.player = new Player({ camera, dom, xr: renderer.xr });
    this.player.controllers.forEach(({ marker }) => (
      this.add(marker)
    ));
    this.add(this.player);

    this.ambient = new Ambient(this.player.head.context.state === 'running');
    this.sfx = new SFX({ listener: this.player.head });

    this.pointables = [];
    this.translocables = [];

    this.worlds = worlds;

    const onFirstInteraction = () => {
      document.removeEventListener('mousedown', onFirstInteraction);
      this.resumeAudio();
    };
    document.addEventListener('mousedown', onFirstInteraction);
  }

  getPhysics() {
    if (this.physics) {
      return Promise.resolve(this.physics);
    }
    if (!this.onPhysics) {
      this.onPhysics = [];
      AmmoPhysics()
        .then((physics) => {
          this.physics = physics;
          this.onPhysics.forEach((resolve) => resolve(physics));
          delete this.onPhysics;
        });
    }
    return new Promise((resolve) => this.onPhysics.push(resolve));
  }

  load(world, options = {}) {
    const {
      ambient,
      climbing,
      physics,
      player,
      pointables,
      translocables,
      worlds,
    } = this;
    if (this.world) {
      if (this.world.onUnload) {
        this.world.onUnload();
      }
      this.remove(this.world);
    }
    this.background = null;
    this.fog = null;
    ambient.set(null);
    climbing.reset();
    player.detachAll();
    if (physics) {
      physics.reset();
    }
    pointables.length = 0;
    translocables.length = 0;
    this.world = new worlds[world](this, options);
    if (this.world.resumeAudio && player.head.context.state === 'running') {
      this.world.resumeAudio();
    }
    this.add(this.world);
  }

  onAnimationTick({ animation, camera, xr }) {
    const {
      ambient,
      climbing,
      player,
      physics,
      pointables,
      translocables,
      world,
    } = this;
    ambient.onAnimationTick(animation);
    player.onAnimationTick({ animation, camera });
    player.controllers.forEach((controller) => {
      const {
        buttons: {
          forwards,
          forwardsUp,
          leftwardsDown,
          rightwardsDown,
          secondaryDown,
        },
        hand,
        marker,
        pointer,
        raycaster,
      } = controller;
      if (!hand) {
        return;
      }
      if (
        !climbing.isOnAir
        && !player.destination
        && hand.handedness === 'left'
        && (leftwardsDown || rightwardsDown)
      ) {
        player.rotate(
          Math.PI * 0.25 * (leftwardsDown ? 1 : -1)
        );
      }
      if (
        !climbing.isOnAir
        && !player.destination
        && hand.handedness === 'right'
        && (forwards || forwardsUp)
      ) {
        const { hit, points } = CurveCast({
          intersects: translocables.flat(),
          raycaster,
        });
        if (hit) {
          if (forwardsUp) {
            player.translocate(hit.point);
          } else {
            marker.update({ animation, hit, points });
          }
        }
      }
      if (pointables.length) {
        const hit = raycaster.intersectObjects(pointables.flat())[0] || false;
        if (hit) {
          pointer.update({
            distance: hit.distance,
            origin: raycaster.ray.origin,
            target: hit,
          });
        }
      }
      if (secondaryDown) {
        xr.getSession().end();
      }
    });
    if (climbing.enabled && physics) {
      let activeHands = 0;
      climbing.movement.set(0, 0, 0);
      player.controllers.forEach((controller, hand) => {
        if (
          controller.hand
          && controller.buttons.gripDown
          && !(climbing.isOnAir && climbing.velocity.length() < -5)
        ) {
          climbing.hand
            .copy(controller.physics.position)
            .applyQuaternion(controller.worldspace.quaternion)
            .add(controller.worldspace.position);
          const contacts = physics.contactTest({
            climbable: true,
            shape: 'sphere',
            radius: 0.1,
            position: climbing.hand,
          });
          if (contacts.length) {
            const { mesh, index } = contacts[0].body;
            climbing.grip[hand] = { mesh, index, time: animation.time };
            controller.pulse(0.3, 30);
          }
        }
        if (climbing.grip[hand]) {
          if (!controller.hand || controller.buttons.gripUp || player.destination) {
            climbing.grip[hand] = false;
            if (!climbing.activeHands) {
              climbing.isOnAir = true;
              climbing.velocity.copy(climbing.lastMovement);
            }
          } else {
            climbing.movement.add(controller.worldspace.movement);
            activeHands += 1;
            climbing.isOnAir = false;
          }
        }
      });
      const jumpGrip = (
        player.controllers[0].hand && player.controllers[0].buttons.grip
        && player.controllers[1].hand && player.controllers[1].buttons.grip
      );
      if (
        !activeHands
        && jumpGrip
        && !player.destination
        && !climbing.isOnAir
        && !climbing.isJumping
      ) {
        climbing.isJumping = true;
      }
      if (climbing.isJumping) {
        if (jumpGrip) {
          activeHands = 2;
          climbing.movement.addVectors(
            player.controllers[0].worldspace.movement,
            player.controllers[1].worldspace.movement
          );
        } else {
          climbing.isJumping = false;
          climbing.isOnAir = true;
          climbing.velocity.copy(climbing.lastMovement);
        }
      }
      if (activeHands) {
        player.move(
          climbing.movement.divideScalar(activeHands).negate()
        );
        climbing.bodyScale = 0;
        climbing.lastMovement.copy(climbing.movement).divideScalar(animation.delta);
      } else if (climbing.isOnAir && !player.destination) {
        climbing.velocity.y -= 9.8 * animation.delta;
        player.move(
          climbing.movement.copy(climbing.velocity).multiplyScalar(animation.delta)
        );
      }

      if (!player.destination) {
        if (!activeHands && climbing.bodyScale < 1) {
          climbing.bodyScale = (
            Math.min(Math.max(climbing.bodyScale + animation.delta * 2, 0.45), 1)
          );
        }
        const radius = 0.2;
        const height = (
          Math.max(player.head.position.y - player.position.y - radius, 0) * climbing.bodyScale ** 2
          + radius * 2
        );
        const contacts = physics.contactTest({
          static: true,
          shape: 'capsule',
          radius,
          height: height - (radius * 2),
          position: {
            x: player.head.position.x,
            y: (player.head.position.y + radius) - height * 0.5,
            z: player.head.position.z,
          },
        });
        if (contacts.length) {
          climbing.movement.set(0, 0, 0);
          contacts.forEach(({
            distance,
            normal,
          }) => {
            climbing.normal.copy(normal).normalize();
            climbing.movement.addScaledVector(climbing.normal, -distance);
            if (
              climbing.bodyScale === 1
              && climbing.normal.dot(climbing.worldUp) > 0
            ) {
              climbing.isOnAir = false;
            }
          });
          if (climbing.movement.length()) {
            player.move(climbing.movement);
          }
        }
      }
    }
    if (world && world.onAnimationTick) {
      world.onAnimationTick(animation);
    }
  }

  resumeAudio() {
    const { ambient, player: { head: { context } }, world } = this;
    if (context.state === 'suspended') {
      context.resume();
    }
    ambient.resume();
    if (world && world.resumeAudio) {
      world.resumeAudio();
    }
  }

  syncTimeOffset(server) {
    const { clock } = this;
    const fetchTimeOffset = (deltas = []) => (
      fetch(`${server}sync`)
        .then((res) => res.text())
        .then((server) => {
          const client = Date.now();
          deltas.push(parseInt(server, 10) - client);
          if (deltas.length < 10) {
            return fetchTimeOffset(deltas);
          }
          return deltas.reduce((sum, delta) => (sum + delta), 0) / deltas.length;
        })
    );
    fetchTimeOffset()
      .then((offset) => {
        clock.serverTimeOffset = offset;
      });
  }
}

export default Scene;
