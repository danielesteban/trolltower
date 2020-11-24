import { Box3, Scene as ThreeScene, Vector3 } from './three.js';
import Ambient from './ambient.js';
import { AmmoPhysics } from './ammo.js';
import CurveCast from './curvecast.js';
import Models from './models.js';
import Player from './player.js';
import SFX from './sfx.js';

// A VR scene base class

class Scene extends ThreeScene {
  constructor({ renderer: { camera, dom, renderer }, worlds }) {
    super();

    this.climbing = {
      activeHands: 0,
      aux: new Box3(),
      hands: [false, false],
      movement: new Vector3(),
      points: [new Vector3(), new Vector3()],
    };

    this.locomotion = Scene.locomotions.teleport;
    this.locomotions = Scene.locomotions;

    this.models = new Models();

    this.player = new Player({ camera, dom, xr: renderer.xr });
    this.player.controllers.forEach(({ marker }) => (
      this.add(marker)
    ));
    this.add(this.player);

    this.ambient = new Ambient(this.player.head.context.state === 'running');
    this.sfx = new SFX({ listener: this.player.head });

    this.climbables = [];
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
    return AmmoPhysics()
      .then((physics) => {
        this.physics = physics;
        return physics;
      });
  }

  load(world, options = {}) {
    const {
      ambient,
      physics,
      player,
      climbables,
      pointables,
      translocables,
      worlds,
    } = this;
    this.background = null;
    this.fog = null;
    this.locomotion = Scene.locomotions.teleport;
    ambient.set(null);
    player.detachAll();
    if (physics) {
      physics.reset();
    }
    climbables.length = 0;
    pointables.length = 0;
    translocables.length = 0;
    if (this.world) {
      if (this.world.onUnload) {
        this.world.onUnload();
      }
      this.remove(this.world);
    }
    this.world = new worlds[world](this, options);
    if (this.world.resumeAudio && player.head.context.state === 'running') {
      this.world.resumeAudio();
    }
    this.add(this.world);
  }

  onBeforeRender({ animation, xr }, scene, camera) {
    const { locomotions } = Scene;
    const {
      ambient,
      climbables,
      climbing,
      locomotion,
      player,
      pointables,
      translocables,
      world,
    } = this;
    ambient.onAnimationTick(animation);
    player.onAnimationTick({ animation, camera });
    climbing.activeHands = 0;
    climbing.movement.set(0, 0, 0);
    player.controllers.forEach((controller, index) => {
      const {
        buttons: {
          backwards,
          forwards,
          forwardsUp,
          gripDown,
          gripUp,
          leftwards,
          leftwardsDown,
          rightwards,
          rightwardsDown,
          secondaryDown,
          triggerDown,
          triggerUp,
        },
        hand,
        marker,
        physics,
        pointer,
        raycaster,
        worldspace,
      } = controller;
      if (!hand) {
        return;
      }
      if (
        !player.destination
        && hand.handedness === 'left'
        && (leftwardsDown || rightwardsDown)
      ) {
        player.rotate(
          Math.PI * 0.25 * (leftwardsDown ? 1 : -1)
        );
      }
      if (
        locomotion === locomotions.teleport
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
      if (
        locomotion === locomotions.fly
        && hand.handedness === 'right'
        && (backwards || forwards || leftwards || rightwards)
      ) {
        const movement = { x: 0, y: 0, z: 0 };
        if (backwards) {
          movement.z = 1;
        }
        if (forwards) {
          movement.z = -1;
        }
        if (leftwards) {
          movement.x = -1;
        }
        if (rightwards) {
          movement.x = 1;
        }
        player.fly({
          animation,
          direction: worldspace.quaternion,
          movement,
        });
      }
      if (climbables.length) {
        if (!climbing.hands[index] && (gripDown || triggerDown)) {
          climbing.aux.setFromObject(physics);
          if (climbables.flat().find((mesh) => {
            if (!mesh.collision) {
              mesh.collision = (new Box3()).setFromObject(mesh);
            }
            return mesh.collision.intersectsBox(climbing.aux);
          })) {
            climbing.hands[index] = true;
          }
        }
        if (climbing.hands[index]) {
          if (gripUp || triggerUp || player.destination) {
            climbing.hands[index] = false;
            if (!climbing.activeHands) {
              climbing.isFalling = true;
              climbing.fallSpeed = 0;
            }
          } else {
            climbing.movement.add(worldspace.movement);
            climbing.activeHands += 1;
            climbing.isFalling = false;
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
    if (climbing.activeHands) {
      player.move(
        climbing.movement.divideScalar(climbing.activeHands).negate()
      );
    } else if (climbing.isFalling && !player.destination) {
      climbing.points[0].set(
        player.head.position.x - 0.2,
        player.position.y,
        player.head.position.z - 0.2
      );
      climbing.points[1].set(
        player.head.position.x + 0.2,
        Math.max(player.position.y + 0.25, player.head.position.y - 0.25),
        player.head.position.z + 0.2
      );
      climbing.aux.setFromPoints(climbing.points);
      if (!translocables.flat().find((mesh) => {
        if (!mesh.collision) {
          mesh.collision = (new Box3()).setFromObject(mesh);
        }
        return mesh.collision.intersectsBox(climbing.aux);
      })) {
        climbing.fallSpeed -= 9.8 * animation.delta;
        player.move(
          climbing.movement.set(0, climbing.fallSpeed * animation.delta, 0)
        );
      } else {
        climbing.isFalling = false;
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
}

Scene.locomotions = {
  fly: 0,
  teleport: 1,
};

export default Scene;
