import { Scene as ThreeScene } from './three.js';
import Ambient from './ambient.js';
import { AmmoPhysics } from './ammo.js';
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
    player.climbing.reset();
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

  onAnimationTick({ animation, camera }) {
    const {
      ambient,
      player,
      physics,
      pointables,
      translocables,
      world,
    } = this;
    ambient.onAnimationTick(animation);
    player.onAnimationTick({
      animation,
      camera,
      physics,
      pointables,
      translocables,
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
