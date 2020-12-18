import {
  Box3,
  DataTexture,
  Mesh,
  NearestFilter,
  PlaneBufferGeometry,
  RGBFormat,
  RepeatWrapping,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
  UnsignedByteType,
  UVMapping,
  Vector3,
} from '../core/three.js';

class Lava extends Mesh {
  static setupGeometry() {
    Lava.geometry = new PlaneBufferGeometry(1, 1);
    Lava.geometry.deleteAttribute('normal');
    Lava.geometry.rotateX(Math.PI * -0.5);
    Lava.geometry.translate(0, 0.25, 0);
  }

  static setupMaterial() {
    const width = 256;
    const height = 256;
    const noise = new Uint8ClampedArray(width * height * 3);
    for (let i = 0, l = noise.length; i < l; i += 3) {
      noise[i] = Math.floor(Math.random() * 256);
      noise[i + 1] = Math.floor(Math.random() * 256);
      noise[i + 2] = Math.floor(Math.random() * 256);
    }
    const texture = new DataTexture(
      noise,
      width,
      height,
      RGBFormat,
      UnsignedByteType,
      UVMapping,
      RepeatWrapping,
      RepeatWrapping,
      NearestFilter,
      NearestFilter
    );
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    Lava.material = new ShaderMaterial({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        map: { value: texture },
        step: { value: 0 },
      },
      vertexShader,
      fragmentShader: fragmentShader
        .replace(
          '#include <common>',
          [
            '#include <common>',
            'uniform float step;',
          ].join('\n')
        )
        .replace(
          '#include <map_fragment>',
          [
            '#ifdef USE_MAP',
            'vec4 noiseA = mapTexelToLinear(texture2D( map, vUv + vec2(step * 0.001) ));',
            'vec4 noiseB = mapTexelToLinear(texture2D( map, vUv - vec2(step * 0.001) ));',
            'diffuseColor *= vec4(1.0, 0.0, 0.0, 1.0) * noiseA.r * noiseB.g * noiseA.b;',
            'diffuseColor += vec4(1.0, 0.5, 0.0, 1.0) * noiseB.r * noiseA.g * noiseB.b;',
            'diffuseColor += vec4(0.01, 0.01, 0.01, 1.0);',
            '#endif',
          ].join('\n')
        ),
      fog: true,
    });
  }

  constructor({ width, depth, sfx }) {
    if (!Lava.geometry) {
      Lava.setupGeometry();
    }
    if (!Lava.material) {
      Lava.setupMaterial();
    }
    super(
      Lava.geometry,
      Lava.material.clone()
    );
    this.auxBox = new Box3();
    this.material.map = this.material.uniforms.map.value;
    this.material.map.repeat.set(width / 32, depth / 32);
    this.material.map.updateMatrix();
    this.material.uniforms.uvTransform.value.copy(this.material.map.matrix);
    this.physics = {
      shape: 'box',
      width,
      height: 0.5,
      depth,
    };
    this.burningBounds = new Box3(
      new Vector3(width * -0.5, 0, depth * -0.5),
      new Vector3(width * 0.5, 3, depth * 0.5)
    );
    this.scale.set(width, 1, depth);
    sfx.load('sounds/lava.ogg')
      .then((sound) => {
        sound.setLoop(true);
        sound.setRefDistance(2);
        this.sound = sound;
        this.add(sound);
        if (sound.context.state === 'running') {
          sound.play();
        }
      });
  }

  animate({ time }) {
    const { material } = this;
    material.uniforms.step.value = time;
  }

  burnsAtPoint(point) {
    const { auxBox, burningBounds, matrixWorld } = this;
    auxBox.copy(burningBounds).applyMatrix4(matrixWorld);
    return auxBox.containsPoint(point);
  }

  resumeAudio() {
    const { sound } = this;
    if (sound && !sound.isPlaying) {
      sound.play();
    }
  }

  stopAudio() {
    const { sound } = this;
    if (sound && sound.isPlaying) {
      sound.stop();
    }
  }
}

export default Lava;
