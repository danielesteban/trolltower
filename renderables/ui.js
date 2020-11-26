import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
  Vector3,
} from '../core/three.js';

// A general purpose UI class

class UI extends Mesh {
  static setupGeometry() {
    UI.geometry = new PlaneBufferGeometry(1, 1, 1, 1);
  }

  constructor({
    width = 0.4,
    height = 0.4,
    buttons = [],
    graphics = [],
    labels = [],
    styles = {},
    textureWidth = 128,
    textureHeight = 128,
  }) {
    if (!UI.geometry) {
      UI.setupGeometry();
    }
    styles = {
      background: 'rgba(0, 0, 0, .2)',
      color: '#fff',
      font: '700 16px monospace',
      textAlign: 'center',
      textBaseline: 'middle',
      ...styles,
      button: {
        background: '#333',
        border: '#000',
        color: '#fff',
        ...(styles.button || {}),
        disabled: {
          background: '#555',
          border: '#000',
          color: '#777',
          ...(styles.button && styles.button.disabled ? styles.button.disabled : {}),
        },
      },
    };
    const renderer = document.createElement('canvas');
    renderer.width = textureWidth;
    renderer.height = textureHeight;
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    super(
      UI.geometry,
      new MeshBasicMaterial({
        map: texture,
        transparent: true,
      })
    );
    this.scale.set(width, height, 1);
    this.buttons = buttons;
    this.context = renderer.getContext('2d');
    this.graphics = graphics;
    this.labels = labels;
    this.pointer = new Vector3();
    this.renderer = renderer;
    this.styles = styles;
    this.texture = texture;
    this.draw();
  }

  dispose() {
    const { material, texture } = this;
    material.dispose();
    texture.dispose();
  }

  draw() {
    const {
      buttons,
      context: ctx,
      graphics,
      labels,
      renderer,
      styles,
      texture,
    } = this;
    ctx.clearRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = styles.background;
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    graphics.forEach((draw) => {
      ctx.save();
      draw({ ctx, styles });
      ctx.restore();
    });
    buttons.forEach(({
      label,
      x,
      y,
      width,
      height,
      background,
      border,
      color,
      font,
      textAlign,
      textBaseline,
      isDisabled,
      isVisible,
    }) => {
      if (isVisible === false) {
        return;
      }
      const button = isDisabled ? styles.button.disabled : styles.button;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.fillStyle = background || button.background;
      ctx.strokeStyle = border || button.border;
      ctx.fill();
      ctx.stroke();
      if (label) {
        ctx.fillStyle = color || button.color;
        ctx.font = font || button.font || styles.font;
        ctx.textAlign = textAlign || button.textAlign || styles.textAlign;
        ctx.textBaseline = textBaseline || button.textBaseline || styles.textBaseline;
        ctx.fillText(
          label,
          width * 0.5,
          height * 0.55
        );
      }
      ctx.restore();
    });
    labels.forEach(({
      x,
      y,
      color,
      font,
      text,
      textAlign,
      textBaseline,
      isVisible,
    }) => {
      if (isVisible === false || !text) {
        return;
      }
      ctx.save();
      ctx.fillStyle = color || styles.color;
      ctx.font = font || styles.font;
      ctx.textAlign = textAlign || styles.textAlign;
      ctx.textBaseline = textBaseline || styles.textBaseline;
      ctx.fillText(text, x, y);
      ctx.restore();
    });
    texture.needsUpdate = true;
  }

  onPointer({ buttons: { triggerDown }, point }) {
    const { buttons, pointer, renderer } = this;
    if (!triggerDown) {
      return;
    }
    this.worldToLocal(pointer.copy(point));
    pointer.set(
      (pointer.x + 0.5) * renderer.width,
      (1 - (pointer.y + 0.5)) * renderer.height,
      0
    );
    const l = buttons.length - 1;
    for (let i = l; i >= 0; i -= 1) {
      const {
        isDisabled,
        x,
        y,
        width,
        height,
        onPointer,
      } = buttons[i];
      if (
        !isDisabled
        && onPointer
        && pointer.x >= x
        && pointer.x <= x + width
        && pointer.y >= y
        && pointer.y <= y + height
      ) {
        onPointer();
        break;
      }
    }
  }
}

export default UI;