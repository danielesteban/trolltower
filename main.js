import Renderer from './core/renderer.js';
import * as worlds from './worlds/index.js';

const renderer = new Renderer({
  dom: {
    enterVR: document.getElementById('enterVR'),
    fps: document.getElementById('fps'),
    renderer: document.getElementById('renderer'),
    support: document.getElementById('support'),
  },
  worlds,
});

renderer.scene.load('Menu');
