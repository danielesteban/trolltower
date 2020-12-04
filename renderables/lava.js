import {
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
} from '../core/three.js';

class Lava extends Mesh {
  static setupGeometry() {
    Lava.geometry = new PlaneBufferGeometry(1, 1);
    Lava.geometry.deleteAttribute('normal');
    Lava.geometry.rotateX(Math.PI * -0.5);
    Lava.geometry.translate(0, 0.5, 0);
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
    Lava.material.map = texture;
  }

  static scaleTexture(width, depth) {
    if (!Lava.material) {
      Lava.setupMaterial();
    }
    const { material } = Lava;
    material.map.repeat.set(width / 32, depth / 32);
    material.map.updateMatrix();
    material.uniforms.uvTransform.value.copy(material.map.matrix);
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
      Lava.material
    );
    this.physics = {
      shape: 'box',
      width,
      height: 1,
      depth,
    };
    Lava.scaleTexture(width, depth);
    this.scale.set(width, 1, depth);
    sfx.load('sounds/lava.ogg')
      .then((sound) => {
        sound.setLoop(true);
        sound.setRefDistance(6);
        this.sound = sound;
        this.add(sound);
        if (sound.context.state === 'running') {
          sound.play();
        }
      });
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

  static animate({ time }) {
    Lava.material.uniforms.step.value = time;
  }
}

export default Lava;
