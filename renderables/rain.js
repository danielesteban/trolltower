import {
  BoxBufferGeometry,
  BufferGeometryUtils,
  Color,
  DynamicDrawUsage,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  Mesh,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
  Vector3,
} from '../core/three.js';

class Rain extends Mesh {
  static setupGeometry() {
    let drop = new BoxBufferGeometry(0.01, 0.5, 0.01);
    drop.deleteAttribute('normal');
    drop.deleteAttribute('uv');
    drop.translate(0, 0.25, 0);
    drop = BufferGeometryUtils.mergeVertices(drop);
    Rain.geometry = {
      index: drop.getIndex(),
      position: drop.getAttribute('position'),
    };
  }

  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    Rain.material = new ShaderMaterial({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        diffuse: { value: new Color(0x1f3847) },
      },
      vertexShader: vertexShader
        .replace(
          '#include <common>',
          [
            'attribute vec3 offset;',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          '#include <begin_vertex>',
          [
            'vec3 transformed = vec3( position + offset );',
          ].join('\n')
        ),
      fragmentShader,
      fog: true,
      defines: {
        FOG_DENSITY: 0.03,
      },
    });
  }

  constructor({ anchor, heightmapScale }) {
    if (!Rain.geometry) {
      Rain.setupGeometry();
    }
    if (!Rain.material) {
      Rain.setupMaterial();
    }
    const geometry = new InstancedBufferGeometry();
    geometry.setIndex(Rain.geometry.index);
    geometry.setAttribute('position', Rain.geometry.position);
    geometry.setAttribute('offset', (new InstancedBufferAttribute(new Float32Array(Rain.numDrops * 3), 3).setUsage(DynamicDrawUsage)));
    super(
      geometry,
      Rain.material
    );
    this.anchor = anchor;
    this.aux = new Vector3();
    this.auxB = new Vector3();
    this.heightmaps = new Map();
    this.heightmaps.scale = heightmapScale;
    this.targets = new Float32Array(Rain.numDrops);
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  addToHeightmap(mesh, transform) {
    // This is only designed to work with chunks from the blocks-editor
    // If you want it to work for other kind of meshes, You'll prolly need to modify it.
    const { chunkSize } = Rain;
    const { aux, auxB, heightmaps } = this;
    const position = mesh.geometry.getAttribute('position');
    const uv = mesh.geometry.getAttribute('uv');
    const { count } = uv;
    mesh.updateMatrixWorld();
    for (let i = 0; i < count; i += 4) {
      // In the blocks-editor chunks,
      // the block facing is encoded on the vertical UV.
      // This will filter only the faces looking up (the ground).
      if (Math.floor(uv.getY(i)) === 0) {
        aux.set(0xFF, 0, 0xFF);
        // Then it searches for the first vertex of that face,
        // since that's the one that has the x & z of the voxel.
        // It needs to check all four because the faces can be flipped
        // by the blocks-editor mesher to avoid anisotropy on the lighting/AO
        for (let j = 0; j < 4; j += 1) {
          auxB.fromBufferAttribute(position, i + j);
          auxB.x += mesh.parent.position.x;
          auxB.z += mesh.parent.position.z;
          if (transform) {
            transform(auxB);
          }
          aux.x = Math.min(aux.x, auxB.x);
          aux.y = Math.max(aux.y, auxB.y);
          aux.z = Math.min(aux.z, auxB.z);
        }
        const chunk = {
          x: Math.floor(aux.x / chunkSize),
          z: Math.floor(aux.z / chunkSize),
        };
        const key = `${chunk.x}:${chunk.z}`;
        let heightmap = heightmaps.get(key);
        if (!heightmap) {
          heightmap = new Uint8Array(256);
          heightmaps.set(key, heightmap);
        }
        aux.x -= chunk.x * chunkSize;
        aux.z -= chunk.z * chunkSize;
        const index = (aux.x * chunkSize) + aux.z;
        heightmap[index] = Math.max(heightmap[index], aux.y);
      }
    }
  }

  animate({ delta }) {
    if (!this.visible) {
      return;
    }
    const { geometry, targets } = this;
    const step = delta * 16;
    const offsets = geometry.getAttribute('offset');
    for (let i = 0; i < Rain.numDrops; i += 1) {
      const y = offsets.getY(i) - step;
      const height = targets[i];
      if (y > height) {
        offsets.setY(i, y);
      } else {
        this.resetDrop(i);
      }
    }
    offsets.needsUpdate = true;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  resetDrop(i) {
    const { chunkSize, radius } = Rain;
    const {
      anchor,
      aux,
      geometry,
      heightmaps,
      targets,
    } = this;
    aux.set(
      anchor.position.x + (Math.random() * (radius * 2 + 1)) - radius,
      0,
      anchor.position.z + (Math.random() * (radius * 2 + 1)) - radius
    );
    const offsets = geometry.getAttribute('offset');
    offsets.setX(i, aux.x);
    offsets.setZ(i, aux.z);

    aux
      .divideScalar(heightmaps.scale)
      .floor();
    const cx = Math.floor(aux.x / chunkSize);
    const cz = Math.floor(aux.z / chunkSize);
    aux.x -= (cx * chunkSize);
    aux.z -= (cz * chunkSize);
    const heightmap = heightmaps.get(`${cx}:${cz}`);
    const height = heightmap ? heightmap[(aux.x * chunkSize) + aux.z] * heightmaps.scale : 0;
    targets[i] = height;
    offsets.setY(i, Math.max(Math.random() * radius * 2, height));
    offsets.needsUpdate = true;
  }

  reset() {
    const { numDrops } = Rain;
    for (let i = 0; i < numDrops; i += 1) {
      this.resetDrop(i);
    }
  }
}

Rain.chunkSize = 16;
Rain.numDrops = 5000;
Rain.radius = 32;

export default Rain;
