import {
  Group,
} from '../core/three.js';
import SponsorsTitle from './sponsorsTitle.js';
import Head from './head.js';
import UI from './ui.js';

class Sponsors extends Group {
  constructor({
    github,
    player,
    server,
    onSessionUpdate,
  }) {
    super();
    this.position.set(-8.5, 2.5, 0);
    this.add(new SponsorsTitle());
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
    cta.position.set(0.6, -0.6, 0);
    cta.rotation.set(Math.PI * -0.25, Math.PI * 0.5, 0, 'YXZ');
    this.add(cta);
    this.cta = cta;
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
    this.github = github;
    this.player = player;
    this.pointables = [cta];
    this.server = server;
    this.onSessionUpdate = onSessionUpdate;
    const session = localStorage.getItem('trolltower::session');
    if (session) {
      this.request({
        endpoint: 'sponsor/session',
        session,
      })
        .then((session) => this.setSession(session));
    }
    this.request({
      endpoint: 'sponsors',
      session: false,
    })
      .then((sponsors) => {
        // TODO: Paginate/Animate this so it works for more than 4 heads
        this.heads = sponsors.slice(0, 4).map(({ name, skin }, i) => {
          const head = new Head();
          head.position.set(0, 0, 1.5 - i);
          head.rotation.set(0, Math.PI * -0.5, 0);
          if (!skin) {
            skin = Head.generateTexture().toDataURL();
          }
          head.updateTexture(skin);
          const label = new UI({
            width: 0.9,
            height: 0.15,
            textureWidth: 192,
            textureHeight: 32,
            labels: [
              {
                x: 96,
                y: 16,
                text: name,
              },
            ],
          });
          label.position.set(0, -0.3, -0.3);
          label.rotation.set(Math.PI * 0.25, Math.PI, 0);
          head.label = label;
          head.add(label);
          this.add(head);
          return head;
        });
      });
  }

  dispose() {
    const { cta, heads } = this;
    cta.dispose();
    this.closeDialogs();
    if (heads) {
      heads.forEach((head) => {
        head.dispose();
        head.label.dispose();
      });
    }
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
}

export default Sponsors;
