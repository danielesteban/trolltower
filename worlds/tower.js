import {
  Color,
  FogExp2,
  Group,
  Matrix4,
  Vector3,
} from '../core/three.js';
import Gameplay from '../core/gameplay.js';
import Ocean from '../renderables/ocean.js';
import Rain from '../renderables/rain.js';

class Tower extends Gameplay {
  constructor(scene, { offset, instance }) {
    const elevators = [];
    const boats = [
      new Vector3(0, 3.5, -29.5),
      new Vector3(0, 3.5, 29.5),
    ].map((position) => {
      const boat = new Group();
      boat.position.copy(position);
      boat.rotation.order = 'YXZ';
      boat.lookAt(0, position.y, 0);
      boat.rotateY(Math.PI);
      boat.updateMatrixWorld();
      elevators.push({
        position: boat.localToWorld(new Vector3(0, -0.5, 4.25)),
        rotation: boat.rotation.y - Math.PI,
      });
      return boat;
    });

    super({
      climbablesPhysics: 'models/towerPhysics.json',
      elevators,
      groundColor: 0x05bb7c,
      platforms: {
        instances: [
          ...[...Array(4)].map((v, i) => {
            const angle = i * Math.PI * 0.5;
            const dist = 1.5;
            const origin = new Vector3(
              Math.cos(angle) * dist,
              21,
              Math.sin(angle) * dist
            );
            return {
              origin,
              direction: new Vector3(origin.x * 2, -16, origin.z * 2),
              speed: 0.5,
            };
          }),
          {
            origin: new Vector3(0, 21, 0),
            direction: new Vector3(0, 10, 0),
            speed: 0.5,
          },
        ],
        model: 'models/platform.glb',
      },
      pickups: {
        instances: [
          ...[...Array(8)].map((v, i) => {
            const angle = i * Math.PI * 0.5;
            const dist = 5;
            return new Vector3(
              Math.cos(angle) * dist,
              Math.floor(i / 4) === 0 ? 26.5 : 18.5,
              Math.sin(angle) * dist
            );
          }),
        ],
        model: 'models/barrel.glb',
      },
      rocketOrigin: new Vector3(0, 31.25, 0),
      rocketRotation: Math.PI * -0.5,
      scene,
      offset,
      room: `Tower-${instance}`,
    });

    const { ambient, models, translocables } = scene;
    ambient.set([
      'sounds/rain.ogg',
      'sounds/sea.ogg',
    ]);
    scene.background = new Color(0x336688);
    scene.fog = new FogExp2(scene.background.getHex(), 0.02);

    const ocean = new Ocean();
    ocean.position.y = 1.675;
    this.add(ocean);

    const rain = new Rain({ anchor: this.player, heightmapScale: 0.5 });
    this.add(rain);
    this.rain = rain;

    const boatModelOffset = new Vector3(-4, -3, 0);
    Promise.all([
      models.load('models/boat.glb')
        .then((model) => {
          model.position.copy(boatModelOffset);
          model.scale.setScalar(0.5);
          boats.forEach((boat) => {
            boat.add(model.clone());
            const rotation = (new Matrix4()).makeRotationY(boat.rotation.y);
            const transform = (vector) => (
              vector
                .addScaledVector(boatModelOffset, 2)
                .applyMatrix4(rotation)
                .addScaledVector(boat.position, 2)
                .floor()
            );
            model.traverse((child) => {
              if (child.isMesh) {
                rain.addToHeightmap(child, transform);
              }
            });
            this.add(boat);
          });
        }),
      models.load('models/tower.glb')
        .then((model) => {
          model.scale.setScalar(0.5);
          model.traverse((child) => {
            if (child.isMesh) {
              rain.addToHeightmap(child);
            }
          });
          rain.heightmaps.get('-1:-1')[255] = 0xFF;
          rain.heightmaps.get('0:-1')[15] = 0xFF;
          rain.heightmaps.get('-1:0')[240] = 0xFF;
          rain.heightmaps.get('0:0')[0] = 0xFF;
          this.add(model);
        }),
    ])
      .then(() => {
        rain.reset();
        rain.visible = true;
        this.spawn.isOpen = true;
      });

    Promise.all([
      scene.getPhysics(),
      models.physics('models/boatPhysics.json', 0.5),
    ])
      .then(([/* physics */, boatPhysics]) => {
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
      });
  }

  onAnimationTick(animation) {
    super.onAnimationTick(animation);
    const { rain } = this;
    Ocean.animate(animation);
    rain.animate(animation);
  }

  onUnload() {
    const { rain } = this;
    super.onUnload();
    rain.dispose();
  }
}

export default Tower;
