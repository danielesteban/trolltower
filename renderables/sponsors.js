import {
  Group,
  Vector3,
} from '../core/three.js';
import PrivateServersTitle from './privateServersTitle.js';
import PrivateServers from './privateServers.js';
import SponsorsTitle from './sponsorsTitle.js';
import Head from './head.js';
import UI from './ui.js';

// THIS CODE IS A BIT TERRIBLE
// BUT THIS IS JUST SORT OF A PROOF OF CONCEPT FOR NOW
// I will definitely clean this up when the sponsors
// functionality is more defined

class Sponsors extends Group {
  constructor({
    anchor,
    elevator,
    github,
    player,
    server,
    onSessionUpdate,
  }) {
    super();
    this.position.set(-7.5, 0, 0);
    this.add(new PrivateServersTitle());
    this.add(new SponsorsTitle());
    this.anchor = anchor;
    const cta = new UI({
      width: 1,
      height: 0.25,
      textureWidth: 400,
      textureHeight: 100,
      buttons: [
        {
          x: 16,
          y: 16,
          background: '#393',
          width: 368,
          height: 68,
          label: 'Become a sponsor',
          font: '700 24px monospace',
          onPointer: () => this.openDialog(this.session ? 'sponsor' : 'login'),
        },
      ],
    });
    cta.position.set(-0.4, 1.9, 0);
    cta.rotation.set(Math.PI * -0.2, Math.PI * 0.5, 0, 'YXZ');
    this.add(cta);
    this.cta = cta;
    const privateServers = new PrivateServers({
      elevator,
      addServer: (code) => (
        this.request({
          endpoint: `sponsor/server/${code}`,
          session: false,
        })
          .then((server) => {
            if (server) {
              const { servers } = privateServers.pages.list;
              if (servers.length === 3) {
                servers.pop();
              }
              servers.unshift(server);
              localStorage.setItem('trolltower::privateServers', JSON.stringify(servers.map(({ code }) => (code))));
            }
            privateServers.setPage('list');
          })
      ),
    });
    privateServers.position.set(0.1, 1.75, -5.75);
    privateServers.rotation.set(Math.PI * -0.1, Math.PI * 0.5, 0, 'YXZ');
    this.add(privateServers);
    this.privateServers = privateServers;
    this.dialogs = {
      login: document.getElementById('login'),
      sponsor: document.getElementById('sponsor'),
    };
    // HACKITY-HACK!!! Please figure out a better way...
    document.getElementById('loginClose').onclick = () => this.closeDialogs();
    document.getElementById('loginLink').onclick = () => this.closeDialogs();
    document.getElementById('loginButton').onclick = () => this.login();
    document.getElementById('logoutButton').onclick = () => this.logout();
    document.getElementById('sponsorClose').onclick = () => this.closeDialogs();
    document.getElementById('sponsorUpdateName').onclick = () => this.updateName();
    document.getElementById('sponsorUpdateSkin').onclick = () => this.updateSkin();
    document.getElementById('sponsorUpdateServerCode').onclick = () => this.updateServerCode();
    document.getElementById('sponsorUpdateServerName').onclick = () => this.updateServerName();
    document.getElementById('sponsorUpdateServerWorld').onclick = () => this.updateServerWorld();
    this.github = github;
    this.player = player;
    this.pointables = [cta, privateServers];
    this.server = server;
    this.onSessionUpdate = onSessionUpdate;
    {
      let knownServers = localStorage.getItem('trolltower::privateServers');
      if (knownServers) {
        try {
          knownServers = JSON.parse(knownServers);
        } catch (e) {
          knownServers = false;
        }
        if (knownServers) {
          Promise.all(knownServers.map((code) => (
            this.request({
              endpoint: `sponsor/server/${code}`,
              session: false,
            })
          )))
            .then((servers) => (
              servers.reduce((servers, server) => {
                if (server) {
                  servers.push(server);
                }
                return servers;
              }, [])
            ))
            .then((servers) => {
              privateServers.pages.list.servers.push(...servers);
              if (privateServers.page === 'list') {
                privateServers.setPage('list');
              }
            });
        }
      }
    }
    const session = localStorage.getItem('trolltower::session');
    if (session) {
      this.request({
        endpoint: 'sponsor/session',
        session,
      })
        .then((session) => this.setSession(session));
    }
    this.heads = [...Array(4)].map((v, i) => {
      const head = new Head();
      head.position.set(-1, 2.5, 1.5 - i);
      head.rotation.set(0, Math.PI * -0.5, 0);
      head.visible = false;
      const label = new UI({
        width: 0.9,
        height: 0.15,
        textureWidth: 192,
        textureHeight: 32,
        labels: [
          {
            x: 96,
            y: 16,
            text: '',
          },
        ],
      });
      label.position.copy(head.position).add(new Vector3(0.3, -0.3, 0));
      label.rotation.set(Math.PI * -0.25, Math.PI * 0.5, 0, 'YXZ');
      label.update = (name) => {
        head.label.labels[0].text = name;
        head.label.draw();
      };
      label.visible = false;
      head.label = label;
      this.add(label);
      this.add(head);
      return head;
    });
    this.headsTimer = 0;
    this.headsPage = 0;
  }

  dispose() {
    const { cta, heads, privateServers } = this;
    cta.dispose();
    if (heads) {
      heads.forEach((head) => {
        head.dispose();
        head.label.dispose();
      });
    }
    privateServers.dispose();
    this.closeDialogs();
  }

  animate({ delta, time }) {
    const { anchor, heads } = this;
    heads.forEach((head, i) => {
      if (head.visible) {
        head.position.y = 2.5 + Math.sin((time + i) * 4) * 0.01;
        head.lookAt(anchor.position);
        head.rotateY(Math.PI);
      }
    });
    this.headsTimer -= delta;
    if (this.headsTimer > 0) {
      return;
    }
    this.headsTimer = 10;
    this.request({
      endpoint: `sponsors?page=${this.headsPage}`,
      session: false,
    })
      .then(({ page, pages, sponsors }) => {
        heads.forEach((head, i) => {
          const sponsor = sponsors[i];
          if (!sponsor) {
            head.visible = false;
            head.label.visible = false;
            return;
          }
          if (!sponsor.skin) {
            sponsor.skin = Head.generateTexture().toDataURL();
          }
          head.updateTexture(sponsor.skin);
          head.label.update(sponsor.name);
          head.label.visible = true;
          head.visible = true;
        });
        this.headsPage = (page + 1) % pages;
      });
  }

  login() {
    const { github, server } = this;
    const w = 512;
    const h = 512;
    const left = (window.screen.width / 2) - w / 2;
    const top = (window.screen.height / 2) - h / 2;
    const win = window.open(
      `https://github.com/login/oauth/authorize?client_id=${github}`,
      'login',
      `width=${w},height=${h},top=${top},left=${left}`
    );
    // HACKITY-HACK!!!
    const feedback = document.getElementById('loginFeedback');
    feedback.className = '';
    feedback.innerText = 'Already a sponsor?';
    const onError = () => {
      feedback.className = 'error';
      feedback.innerText = 'Error: Couldn\'t verify sponsorship.';
    };
    let watcher = setInterval(() => {
      if (!win.window) {
        if (watcher) {
          clearInterval(watcher);
          onError();
        }
        return;
      }
      win.postMessage(true, server);
    }, 100);
    const onMessage = ({ origin, data: { session } }) => {
      if (origin === server) {
        window.removeEventListener('message', onMessage);
        clearInterval(watcher);
        watcher = false;
        if (!session) {
          onError();
          return;
        }
        this.setSession(session);
        this.openDialog('sponsor');
      }
    };
    window.addEventListener('message', onMessage, false);
  }

  logout() {
    this.setSession();
    this.closeDialogs();
  }

  request({
    endpoint,
    body,
    method = 'GET',
    session,
  }) {
    const { server } = this;
    session = session !== undefined ? session : this.session;
    return fetch(`${server}/${endpoint}`, {
      headers: {
        ...(session ? { Authorization: `Bearer ${session}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      method,
    })
      .then((res) => {
        if ((res.headers.get('content-type') || '').indexOf('application/json') === 0) {
          return res.json();
        }
        return res.text();
      });
  }

  setSession(session) {
    const { onSessionUpdate } = this;
    this.session = session;
    if (session) {
      const { id, iat, exp, ...profile } = JSON.parse(atob(session.split('.')[1]));
      this.profile = profile;
      localStorage.setItem('trolltower::session', session);
      // HACKITY-HACK!!!
      document.getElementById('sponsorName').value = profile.name;
      this.request({
        endpoint: 'sponsor/server',
      })
        .then((server) => {
          // HACKITY-HACK!!!
          document.getElementById('sponsorServerCode').innerText = server.code;
          document.getElementById('sponsorServerName').value = server.name;
          document.getElementById('sponsorServerWorld').value = server.world;
        });
    } else {
      delete this.profile;
      localStorage.removeItem('trolltower::session', session);
    }
    if (onSessionUpdate) {
      onSessionUpdate();
    }
  }

  closeDialogs() {
    const { dialogs } = this;
    Object.keys(dialogs).forEach((dialog) => {
      dialogs[dialog].className = 'dialog';
    });
  }

  openDialog(dialog) {
    const { dialogs, player } = this;
    this.closeDialogs();
    dialogs[dialog].className = 'dialog open';
    if (player.xr.enabled && player.xr.isPresenting) {
      player.xr.getSession().end();
    }
  }

  updateName() {
    const { profile } = this;
    // HACKITY-HACK!!!
    profile.name = document.getElementById('sponsorName').value;
    this.request({
      body: { name: profile.name },
      endpoint: 'sponsor',
      method: 'PUT',
    });
  }

  updateSkin() {
    const { player } = this;
    this.request({
      body: { skin: player.skin },
      endpoint: 'sponsor',
      method: 'PUT',
    });
  }

  updateServerCode() {
    this.request({
      body: { code: true },
      endpoint: 'sponsor/server',
      method: 'PUT',
    })
      .then(() => (
        this.request({
          endpoint: 'sponsor/server',
        })
      ))
      .then((server) => {
        // HACKITY-HACK!!!
        document.getElementById('sponsorServerCode').innerText = server.code;
      });
  }

  updateServerName() {
    // HACKITY-HACK!!!
    const name = document.getElementById('sponsorServerName').value;
    this.request({
      body: { name },
      endpoint: 'sponsor/server',
      method: 'PUT',
    });
  }

  updateServerWorld() {
    // HACKITY-HACK!!!
    const world = document.getElementById('sponsorServerWorld').value;
    this.request({
      body: { world },
      endpoint: 'sponsor/server',
      method: 'PUT',
    });
  }
}

export default Sponsors;
