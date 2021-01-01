import { Color, FogExp2, Vector3 } from '../core/three.js';
import Gameplay from '../core/gameplay.js';

class LivingRoom extends Gameplay {
  constructor(scene, { instance, offset, room, spectator }) {
    super({
      room: room || `LivingRoom-${instance}`,
      scene,
      offset,
      spectator,
      climbables: 'models/livingroomPhysics.json',
      elevators: [
        { position: new Vector3(20, 14, -24.75), rotation: 0 },
      ],
      rocketOrigin: new Vector3(-19.5, 10.75, 4.5),
      rocketRotation: Math.PI * 0.5,
    });

    const { ambient, models } = scene;
    ambient.set('sounds/forest.ogg');
    scene.background = new Color(0x180B1B);
    scene.fog = new FogExp2(scene.background.getHex(), 0.03);
    models.load('models/livingroom.glb')
      .then((model) => {
        model.scale.setScalar(0.5);
        model.traverse((child) => {
          child.matrixAutoUpdate = false;
          child.updateMatrix();
        });
        this.add(model);
        this.spawn.isOpen = true;
      });
  }
}

LivingRoom.display = {
  name: 'Eric\'s Living Room',
  background: '#663366',
  foreground: '#fff',
  fontSize: 24,
};

export default LivingRoom;
