import {
  DataTexture3D,
  LinearFilter,
  ShaderMaterial,
  RedFormat,
  ShaderLib,
  UniformsUtils,
  Vector3,
} from './three.js';

class Lightmap extends ShaderMaterial {
  constructor({ baseShader, lightmap }) {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib[baseShader];
    const texture = new DataTexture3D(new Uint8ClampedArray(atob(lightmap.data).split('').map((c) => c.charCodeAt(0))), lightmap.size.x, lightmap.size.y, lightmap.size.z);
    texture.format = RedFormat;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.unpackAlignment = 1;
    super({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        lightmapBlending: { value: 1 },
        lightmapIntensity: { value: 1 },
        lightmapOrigin: { value: (new Vector3()).copy(lightmap.origin) },
        lightmapSize: { value: (new Vector3()).copy(lightmap.size) },
        lightmapTexture: { value: texture },
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
          'uniform sampler3D lightmapTexture;',
          'uniform float lightmapBlending;',
          'uniform float lightmapIntensity;',
          'varying vec3 lightmapPosition;',
        ].join('\n'))
        .replace('vec3 outgoingLight = reflectedLight.indirectDiffuse;', [
          'vec3 outgoingLight = reflectedLight.indirectDiffuse * mix(vec3(1.0), vec3(texture(lightmapTexture, lightmapPosition).r * lightmapIntensity), lightmapBlending);',
        ].join('\n')),
    });
  }

  clone() {
    return new ShaderMaterial().copy(this);
  }
}

export default Lightmap;
