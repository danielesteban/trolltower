import { Color, Group } from '../core/three.js';
import Head from './head.js';
import SkinTitle from './skinTitle.js';
import UI from './ui.js';

class Skin extends Group {
  constructor({
    onSave,
    texture,
  }) {
    super();

    this.add(new SkinTitle());

    const head = new Head();
    head.onPointer = ({ buttons, uv }) => {
      if (buttons.primaryDown) {
        color.copy(head.getColor(uv));
        area.color.copy(color);
        palette.update();
        picker.draw();
        return;
      }
      head.updatePixel({
        color: `#${color.getHexString()}`,
        remove: buttons.gripDown,
        uv,
      });
      save();
    };
    head.position.set(0, 0.75, 0);
    head.updateTexture(texture, true);
    head.setLayer('transparent');
    this.add(head);

    const history = {
      current: texture,
      past: [],
      future: [],
      buttons: [
        {
          x: 14,
          y: 54,
          width: 46,
          height: 32,
          label: '←',
          textOffset: -1,
          isDisabled: true,
          onPointer: () => history.undo(),
        },
        {
          x: 68,
          y: 54,
          width: 46,
          height: 32,
          label: '→',
          textOffset: -1,
          isDisabled: true,
          onPointer: () => history.redo(),
        },
      ],
      push(texture) {
        this.future.length = 0;
        this.past.push(this.current);
        if (this.past.length > 20) {
          this.past.shift();
        }
        this.current = texture;
        this.buttons[0].isDisabled = !this.past.length;
        this.buttons[1].isDisabled = true;
        layers.draw();
      },
      undo() {
        this.future.unshift(this.current);
        this.current = this.past.pop();
        this.buttons[0].isDisabled = !this.past.length;
        this.buttons[1].isDisabled = false;
        layers.draw();
        head.updateTexture(this.current, true);
        onSave(texture);
      },
      redo() {
        this.past.push(this.current);
        this.current = this.future.shift();
        this.buttons[0].isDisabled = false;
        this.buttons[1].isDisabled = !this.future.length;
        layers.draw();
        head.updateTexture(this.current, true);
        onSave(texture);
      },
    };

    const save = () => {
      const texture = head.renderer.toDataURL();
      history.push(texture);
      onSave(texture);
    };

    const setLayer = (layer) => {
      head.setLayer(layer);
      layers.buttons[layer === 'transparent' ? 0 : 1].background = '#393';
      delete layers.buttons[layer === 'transparent' ? 1 : 0].background;
      layers.draw();
    };
    const layers = new UI({
      buttons: [
        {
          x: 14,
          y: 8,
          background: '#393',
          width: 46,
          height: 32,
          label: 'HAIR',
          onPointer: () => setLayer('transparent'),
        },
        {
          x: 68,
          y: 8,
          width: 46,
          height: 32,
          label: 'SKIN',
          onPointer: () => setLayer('opaque'),
        },
        ...history.buttons,
        {
          x: 14,
          y: 96,
          width: 100,
          height: 24,
          label: 'RANDOMIZE',
          onPointer: () => {
            head.regenerate();
            save();
          },
        },
      ],
    });
    layers.position.set(0.25, -0.2, -0.65);
    layers.rotation.set(Math.PI * 0.25, Math.PI, 0);
    this.add(layers);

    const aux = new Color();
    const color = new Color(Math.random() * 0xFFFFFF);
    const width = 128;
    const height = 128;
    const area = {
      color: color.clone(),
      x: width * 0.05,
      y: height * 0.05,
      width: width * 0.75,
      height: height * 0.75,
    };
    const strip = {
      x: width * 0.85,
      y: height * 0.05,
      width: width * 0.1,
      height: height * 0.75,
    };
    const palette = {
      count: 7,
      colors: [],
      x: width * 0.05,
      y: height * 0.85,
      size: width * 0.1,
      spacing: width * 0.033,
      update() {
        const { buttons, colors } = this;
        const hex = color.getHex();
        const exists = colors.indexOf(hex);
        if (~exists) {
          colors.splice(exists, 1);
        }
        colors.unshift(hex);
        buttons.forEach(((button, i) => {
          button.background = `#${aux.setHex(colors[i] || 0).getHexString()}`;
        }));
      },
    };
    palette.buttons = [...Array(palette.count)].map((v, i) => ({
      background: `#${aux.setHex(palette.colors[i] || 0).getHexString()}`,
      x: palette.x + ((palette.size + palette.spacing) * i),
      y: palette.y,
      width: palette.size,
      height: palette.size,
      onPointer: () => {
        color.setHex(palette.colors[i]);
        area.color.copy(color);
        palette.update();
        picker.draw();
      },
    }));
    const picker = new UI({
      textureWidth: width,
      textureHeight: height,
      buttons: [
        {
          x: 0,
          y: 0,
          width,
          height,
          isVisible: false,
          onPointer: () => {
            const { context: ctx, pointer } = picker;
            for (let i = 0; i < 2; i += 1) {
              const {
                x,
                y,
                width,
                height,
              } = i === 0 ? area : strip;
              if (
                pointer.x >= x
                && pointer.x <= x + width
                && pointer.y >= y
                && pointer.y <= y + height
              ) {
                const imageData = ctx.getImageData(pointer.x, pointer.y, 1, 1).data;
                color.setRGB(
                  imageData[0] / 0xFF,
                  imageData[1] / 0xFF,
                  imageData[2] / 0xFF
                );
                palette.update();
                if (i === 1) {
                  area.color.setRGB(
                    imageData[0] / 0xFF,
                    imageData[1] / 0xFF,
                    imageData[2] / 0xFF
                  );
                }
                picker.draw();
                break;
              }
            }
          },
        },
        ...palette.buttons,
      ],
      graphics: [
        ({ ctx }) => {
          const {
            x,
            y,
            width,
            height,
          } = area;
          ctx.translate(x, y);
          ctx.fillStyle = `#${area.color.getHexString()}`;
          ctx.fillRect(0, 0, width, height);

          const grdWhite = ctx.createLinearGradient(0, 0, width, 0);
          grdWhite.addColorStop(0, 'rgba(255,255,255,1)');
          grdWhite.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grdWhite;
          ctx.fillRect(0, 0, width, height);

          const grdBlack = ctx.createLinearGradient(0, 0, 0, height);
          grdBlack.addColorStop(0, 'rgba(0,0,0,0)');
          grdBlack.addColorStop(1, 'rgba(0,0,0,1)');
          ctx.fillStyle = grdBlack;
          ctx.fillRect(0, 0, width, height);
        },
        ({ ctx }) => {
          const {
            x,
            y,
            width,
            height,
          } = strip;
          ctx.translate(x, y);
          const grd = ctx.createLinearGradient(0, 0, 0, height);
          [
            '255,0,0',
            '255,0,255',
            '0,0,255',
            '0,255,255',
            '0,255,0',
            '255,255,0',
            '255,0,0',
          ].forEach((color, i) => {
            grd.addColorStop(Math.min(0.17 * i, 1), `rgb(${color})`);
          });
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, width, height);
        },
      ],
    });
    picker.position.set(-0.25, -0.2, -0.65);
    picker.rotation.set(Math.PI * 0.25, Math.PI, 0);
    this.add(picker);
    this.pointables = [head, layers, picker];
  }

  dispose() {
    const { children } = this;
    children.forEach((child) => (
      child.dispose()
    ));
  }
}

export default Skin;
