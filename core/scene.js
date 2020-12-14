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
    player.detachAll();
    player.isOnAir = false;
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

  onBeforeRender({ animation, xr }, scene, camera) {
    const {
      ambient,
      player,
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
        !player.isOnAir
        && !player.destination
        && hand.handedness === 'left'
        && (leftwardsDown || rightwardsDown)
      ) {
        player.rotate(
          Math.PI * 0.25 * (leftwardsDown ? 1 : -1)
        );
      }
      if (
        !player.isOnAir
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
