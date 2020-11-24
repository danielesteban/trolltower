import { BufferGeometry, IcosahedronGeometry } from '../core/three.js';
import Bodies from './bodies.js';

class Spheres extends Bodies {
  static setupGeometry() {
    const sphere = new IcosahedronGeometry(0.2, 3);
    sphere.faces.forEach((face) => (
      face.color.offsetHSL(0, 0, -(0.2 + Math.random() * 0.1))
    ));
    const geometry = (new BufferGeometry()).fromGeometry(sphere);
    geometry.physics = {
      shape: 'sphere',
      radius: sphere.parameters.radius,
    };
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    Spheres.geometry = geometry;
  }

  constructor({ count = 100, material }) {
    if (!Spheres.geometry) {
      Spheres.setupGeometry();
    }
    super({
      count,
      material,
      geometry: Spheres.geometry,
    });
  }
}

export default Spheres;
