import {
  Color,
  DoubleSide,
  ShaderMaterial,
  ShaderLib,
  UniformsUtils,
  Vector3,
} from './three.js';

class Lightmap extends ShaderMaterial {
  constructor({
    baseShader = 'basic',
    blending = 1,
    channels,
    intensity = 1,
    origin,
    size,
    textures,
  }) {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib[baseShader];
    super({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        lightmapBlending: { value: blending },
        lightChannel0Color: { value: (new Color()).copy(channels[0]) },
        lightChannel1Color: { value: (new Color()).copy(channels[1]) },
        lightChannel2Color: { value: (new Color()).copy(channels[2]) },
        lightChannel3Color: { value: (new Color()).copy(channels[3]) },
        lightmapIntensity: { value: intensity },
        lightmapOrigin: { value: (new Vector3()).copy(origin) },
        lightmapSize: { value: (new Vector3()).copy(size) },
        ...textures.reduce((textures, texture, i) => {
          textures[`lightmapTexture${i}`] = { value: texture };
          return textures;
        }, {}),
      },
      vertexShader: vertexShader
        .replace('#include <clipping_planes_pars_vertex>', [
          '#include <clipping_planes_pars_vertex>',
          'uniform vec3 lightmapSize;',
          'uniform vec3 lightmapOrigin;',
          'varying vec3 lightmapPosition;',
        ].join('\n'))
        .replace('#include <clipping_planes_vertex>', [
          '#include <clipping_planes_vertex>',
          'vec4 worldPos = vec4(position, 1.0);',
          '#ifdef USE_INSTANCING',
          'worldPos = instanceMatrix * worldPos;',
          '#endif',
          'worldPos = modelMatrix * worldPos;',
          'lightmapPosition = (vec3(worldPos) - lightmapOrigin) / lightmapSize;',
        ].join('\n')),
      fragmentShader: fragmentShader
        .replace('#include <clipping_planes_pars_fragment>', [
          '#include <clipping_planes_pars_fragment>',
          'precision highp sampler3D;',
          ...textures.map((texture, i) => (
            `uniform sampler3D lightmapTexture${i};`
          )),
          'uniform float lightmapBlending;',
          'uniform vec3 lightChannel0Color;',
          'uniform vec3 lightChannel1Color;',
          'uniform vec3 lightChannel2Color;',
          'uniform vec3 lightChannel3Color;',
          'uniform float lightmapIntensity;',
          'varying vec3 lightmapPosition;',
        ].join('\n'))
        .replace('vec3 outgoingLight = reflectedLight.indirectDiffuse;', [
          'vec3 sampledLight;',
          'vec4 lightmapSample;',
          ...textures.reduce((code, texture, i) => {
            code.push(
              `lightmapSample = texture(lightmapTexture${i}, lightmapPosition);`,
              'sampledLight += lightChannel0Color * lightmapSample.r;',
              'sampledLight += lightChannel1Color * lightmapSample.g;',
              'sampledLight += lightChannel2Color * lightmapSample.b;',
              'sampledLight += lightChannel3Color * lightmapSample.a;'
            );
            return code;
          }, []),
          'vec3 outgoingLight = reflectedLight.indirectDiffuse * mix(vec3(1.0), saturate(sampledLight) * lightmapIntensity, lightmapBlending);',
        ].join('\n')),
      fog: true,
      vertexColors: true,
    });
  }

  clone() {
    return new ShaderMaterial().copy(this);
  }

  static swapMaterials(child, lightmap, materials = {}) {
    const { material: { alphaTest, map, transparent } } = child;
    let material;
    if (alphaTest) {
      material = materials.alpha;
      if (!material) {
        material = lightmap.clone();
        material.alphaTest = 1;
        material.side = DoubleSide;
        material.uniforms.map.value = map;
        material.map = map;
        materials.alpha = material;
      }
    } else if (transparent) {
      material = materials.blending;
      if (!material) {
        material = lightmap.clone();
        material.transparent = true;
        material.uniforms.map.value = map;
        material.map = map;
        materials.blending = material;
      }
    } else {
      material = materials.opaque;
      if (!material) {
        material = lightmap.clone();
        material.uniforms.map.value = map;
        material.map = map;
        materials.opaque = material;
      }
    }
    child.material = material;
  }
}

export default Lightmap;
