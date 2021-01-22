import {
  BufferAttribute,
  BufferGeometryUtils,
  IcosahedronBufferGeometry,
} from '../core/three.js';
import Bodies from './bodies.js';

class Spheres extends Bodies {
  static setupGeometry() {
    const sphere = new IcosahedronBufferGeometry(0.2, 3);
    sphere.deleteAttribute('normal');
    sphere.deleteAttribute('uv');
    const geometry = sphere.toNonIndexed();
    const { count } = geometry.getAttribute('position');
    const color = new BufferAttribute(new Float32Array(count * 3), 3);
    let light;
    for (let i = 0; i < count; i += 1) {
      if (i % 3 === 0) {
        light = 0.8 - Math.random() * 0.1;
      }
      color.setXYZ(i, light, light, light);
    }
    geometry.setAttribute('color', color);
    Spheres.geometry = BufferGeometryUtils.mergeVertices(geometry);
    Spheres.geometry.physics = {
      shape: 'sphere',
      radius: sphere.parameters.radius,
    };
  }

  constructor({
    count = 100,
    sfx,
    sound,
  }) {
    if (!Spheres.geometry) {
      Spheres.setupGeometry();
    }
    super({
      count,
      geometry: Spheres.geometry,
      sfx,
      sound,
    });
  }
}

export default Spheres;
