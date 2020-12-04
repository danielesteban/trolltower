import {
  Color,
  FogExp2,
  Vector3,
} from '../core/three.js';
import Gameplay from './gameplay.js';
import Effect from '../renderables/effect.js';
import Lava from '../renderables/lava.js';

class Well extends Gameplay {
  constructor(scene, { offset, instance }) {
    super({
      elevators: [
        { position: new Vector3(13.25, 33.5, 0), rotation: Math.PI * -0.5 },
        { position: new Vector3(-13.25, 33.5, 0), rotation: Math.PI * 0.5 },
      ],
      rocketOrigin: new Vector3(0, 7.25, 0),
      rocketRotation: Math.PI,
      scene,
      offset,
      room: `Well-${instance}`,
      terrainPhysics: 'models/wellTerrainPhysics.json',
      towerPhysics: 'models/wellPhysics.json',
    });

    const { ambient, models, sfx } = scene;

    ambient.set('sounds/forest.ogg');
    scene.background = new Color(0x0A0A11);
    scene.fog = new FogExp2(scene.background.getHex(), 0.02);

    const burning = new Effect({ anchor: this.player.head, color: 0xFF0000 });
    this.add(burning);
    this.burning = burning;

    const lava = new Lava({ width: 32, depth: 32, sfx });
    this.add(lava);
    this.lava = lava;

    models.load('models/well.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        this.add(model);
        this.spawn.isOpen = true;
      });

    scene.getPhysics()
      .then(() => {
        lava.onContact = this.player.head.physics.onContact;
        this.physics.addMesh(lava, 0, { isTrigger: true });
      });
  }

  onAnimationTick(animation) {
    const { burning, player } = this;
    super.onAnimationTick(animation);
    if (burning.visible || player.head.position.y < 3) {
      if (burning.animate(animation)) {
        this.respawn();
      }
    }
    Lava.animate(animation);
  }

  respawn() {
    const { burning } = this;
    super.respawn();
    burning.reset();
  }

  resumeAudio() {
    const { lava } = this;
    lava.resumeAudio();
  }

  onUnload() {
    const { lava } = this;
    super.onUnload();
    lava.stopAudio();
  }
}

export default Well;
