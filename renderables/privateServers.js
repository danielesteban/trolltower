import {
  Group,
} from '../core/three.js';
import PrivateServersTitle from './privateServersTitle.js';
import UI from './ui.js';

class PrivateServers extends Group {
  constructor() {
    super();
    this.position.set(-7.5, 0, -5);
    this.add(new PrivateServersTitle());
    this.pointables = [];
    const ui = new UI({
      buttons: [
        {
          x: 14,
          y: 96,
          width: 100,
          height: 24,
          label: 'ENTER CODE',
          onPointer: () => {},
        },
      ],
      labels: [
        {
          x: 64,
          y: 16,
          text: 'Recent servers',
        },
        {
          x: 64,
          y: 48,
          text: 'NONE',
          color: '#999',
        },
      ],
    });
    ui.position.set(0.1, 1.75, -0.75);
    ui.rotation.set(Math.PI * -0.1, Math.PI * 0.5, 0, 'YXZ');
    this.add(ui);
    this.ui = ui;
  }

  dispose() {
    const { ui } = this;
    ui.dispose();
  }
}

export default PrivateServers;
