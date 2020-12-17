import {
  BufferGeometry,
  BufferGeometryUtils,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
} from '../core/three.js';

// A mesh to visualize the translocation destination and the curvecast path

class Marker extends Group {
  static setupGeometry() {
    const outer = new TorusGeometry(0.3, 0.025, 16, 32);
    const inner = new TorusGeometry(0.15, 0.0125, 16, 24);
    [outer, inner].forEach(({ faces }) => faces.forEach((face, i) => {
      if (i % 2 === 1) {
        face.color.offsetHSL(0, 0, Math.random() * -0.1);
        faces[i - 1].color.copy(face.color);
      }
    }));
    outer.merge(inner);
    outer.rotateX(Math.PI * -0.5);
    const geometry = (new BufferGeometry()).fromGeometry(outer);
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    Marker.geometry = BufferGeometryUtils.mergeVertices(geometry);
  }

  static setupMaterial() {
    Marker.material = new MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      opacity: 0.5,
      transparent: true,
    });
  }

  static setupLineMaterial() {
    Marker.lineMaterial = new LineBasicMaterial({
      color: (new Color(0xffe0bd)).convertSRGBToLinear(),
    });
  }

  constructor() {
    if (!Marker.geometry) {
      Marker.setupGeometry();
    }
    if (!Marker.material) {
      Marker.setupMaterial();
    }
    if (!Marker.lineMaterial) {
      Marker.setupLineMaterial();
    }
    super();
    this.disc = new Mesh(
      Marker.geometry,
      Marker.material
    );
    this.add(this.disc);
    this.line = new Line(
      new BufferGeometry(),
      Marker.lineMaterial
    );
    this.add(this.line);
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  update({ animation: { delta }, hit, points }) {
    const { disc, line } = this;
    if (hit) {
      disc.rotation.y += delta;
      disc.position.copy(hit.point);
      disc.updateWorldMatrix();
      disc.visible = true;
    } else {
      disc.visible = false;
    }
    if (points) {
      line.geometry.setFromPoints(points);
      line.geometry.computeBoundingSphere();
      line.visible = true;
    } else {
      line.visible = false;
    }
    this.visible = true;
  }
}

export default Marker;
