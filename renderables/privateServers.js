import UI from './ui.js';

class PrivateServers extends UI {
  constructor({
    addServer,
  }) {
    super({});
    const setServer = (server) => {
      this.pages.list.buttons.forEach((button) => {
        if (button.server === server) {
          button.background = '#393';
        } else {
          delete button.background;
        }
      });
      this.draw();
      this.setupElevator(server);
    };
    this.pages = {
      check: {
        labels: [
          {
            x: 64,
            y: 34,
            text: '',
            color: '#999',
          },
          {
            x: 64,
            y: 64,
            text: 'LOADING...',
          },
        ],
        reset() {
          this.labels[0].text = this.code.split('').join(' ');
          addServer(this.code);
        },
      },
      input: {
        buttons: [
          ['A', 'B', 'C', 'D', 'E', 'F'],
          ['0', '1', '2', '3', '4', '5'],
          ['6', '7', '8', '9'],
        ].reduce((buttons, row, i) => {
          row.forEach((digit, j) => (
            buttons.push({
              x: 4 + j * 20,
              y: 50 + i * 20,
              width: 20,
              height: 20,
              label: digit,
              onPointer: () => {
                const code = this.pages.input.type(digit);
                if (code) {
                  this.pages.check.code = code;
                  this.setPage('check');
                } else {
                  this.draw();
                }
              },
            })
          ));
          return buttons;
        }, []),
        labels: [
          {
            x: 64,
            y: 8,
            text: 'ENTER CODE',
          },
          {
            x: 64,
            y: 34,
            text: '',
            color: '#999',
          },
        ],
        reset() {
          this.code = '';
          this.update();
        },
        type(digit) {
          this.code = this.code.concat(digit);
          if (this.code.length < 6) {
            this.update();
            return false;
          }
          return this.code;
        },
        update() {
          this.labels[1].text = [...Array(6)].map((v, i) => (
            i < this.code.length ? this.code.substr(i, 1) : '_'
          )).join(' ');
        },
      },
      list: {
        servers: [],
        buttons: [
          {
            x: 14,
            y: 96,
            width: 100,
            height: 24,
            label: 'ENTER CODE',
            onPointer: () => (
              this.setPage('input')
            ),
          },
        ],
        labels: [
          {
            x: 64,
            y: 8,
            text: 'Recent servers',
          },
        ],
        reset() {
          this.buttons = this.buttons.slice(0, 1);
          this.labels = this.labels.slice(0, 1);
          if (!this.servers.length) {
            this.labels.push({
              x: 64,
              y: 32,
              text: 'NONE',
              color: '#999',
            });
          } else {
            this.servers.forEach((server, i) => this.buttons.push({
              x: 8,
              y: 20 + i * 24,
              width: 112,
              height: 24,
              label: server.name.length >= 14 ? `${server.name.substr(0, 11)}...` : server.name,
              font: '700 12px monospace',
              server,
              onPointer: () => setServer(server),
            }));
          }
        },
      },
    };
    this.setPage('list');
  }

  setPage(id) {
    const { pages } = this;
    const page = pages[id];
    page.reset();
    this.buttons = page.buttons || [];
    this.labels = page.labels || [];
    this.page = id;
    this.draw();
  }
}

export default PrivateServers;
