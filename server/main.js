const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const expressWS = require('express-ws');
const helmet = require('helmet');
const nocache = require('nocache');
const Room = require('./room');
const Sponsors = require('./sponsors');
const Stats = require('./stats');

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false;
const allowedRooms = process.env.ALLOWED_ROOMS ? process.env.ALLOWED_ROOMS.split(',') : false;

const server = express();
server.use(helmet({
  contentSecurityPolicy: false,
}));
expressWS(server, null, { clientTracking: false });

const rooms = new Map();
const stats = process.env.STATS_STORAGE ? new Stats(process.env.STATS_STORAGE) : false;
const sponsors = process.env.SPONSORS_STORAGE ? new Sponsors(process.env.SPONSORS_STORAGE) : false;

server.ws('/:room', (client, req) => (
  (new Promise((resolve, reject) => {
    if (allowedOrigins && !allowedOrigins.includes(req.headers.origin)) {
      return reject('Origin not allowed.');
    }

    const { room: key } = req.params;
    if (key === 'Menu') {
      const id = 'Menu';
      let instance;
      let i = 1;
      while (!instance) {
        const room = rooms.get(`${id}-${i}`);
        if (!room || room.clients.length < room.constructor.maxClients) {
          instance = i;
        }
        i += 1;
      }
      return resolve({ id, instance });
    }

    let [id, instance] = `${key}`.split('-');
    id = `${id}`;
    instance = parseInt(`${instance}`, 10);
    if (Number.isNaN(instance) || instance <= 0) {
      return reject('Room not allowed.');
    }
    if (!allowedRooms || allowedRooms.includes(id)) {
      return resolve({ id, instance });
    }
    if (allowedRooms && (!sponsors || instance !== 1)) {
      return reject('Room not allowed.');
    }
    return sponsors.getServerByCode(id)
      .then((server) => {
        if (!server) {
          return reject('Room not allowed.');
        }
        resolve({ id, instance, isPrivate: true });
      });
  }))
    .then(({ id, instance, isPrivate }) => {
      const key = `${id}-${instance}`;
      let room = rooms.get(key);
      if (!room) {
        room = new Room({
          id,
          instance,
          isPrivate,
          stats,
        });
        rooms.set(key, room);
      }
      room.onClient(client);
    })
    .catch((error) => {
      client.send(JSON.stringify({
        type: 'ERROR',
        data: error,
      }), () => {});
      client.terminate();
    })
));

server.get('/peers', cors({ origin: allowedOrigins || true }), nocache(), (req, res) => {
  const peers = {};
  rooms.forEach(({
    clients,
    id,
    instance,
    isPrivate,
  }) => {
    if (!isPrivate && clients.length) {
      peers[`${id}-${instance}`] = clients.length;
    }
  });
  res.json(peers);
});

if (sponsors) {
  server.get('/sponsors', cors({ origin: allowedOrigins || true }), nocache(), (req, res) => (
    sponsors.list(req, res)
  ));
  server.options('/sponsor', cors({ origin: allowedOrigins || true }));
  server.put('/sponsor', cors({ origin: allowedOrigins || true }), nocache(), bodyParser.json(), (req, res) => (
    sponsors.update(req, res)
  ));
  server.get('/sponsor/login', (req, res) => (
    sponsors.login(req, res, allowedOrigins)
  ));
  server.options('/sponsor/session', cors({ origin: allowedOrigins || true }));
  server.get('/sponsor/session', cors({ origin: allowedOrigins || true }), nocache(), (req, res) => (
    sponsors.refreshSession(req, res)
  ));
  server.options('/sponsor/server', cors({ origin: allowedOrigins || true }));
  server.get('/sponsor/server', cors({ origin: allowedOrigins || true }), nocache(), (req, res) => (
    sponsors.getUserServer(req, res)
  ));
  server.put('/sponsor/server', cors({ origin: allowedOrigins || true }), nocache(), bodyParser.json(), (req, res) => (
    sponsors.updateServer(req, res, allowedRooms)
  ));
  server.get('/sponsor/server/:code', cors({ origin: allowedOrigins || true }), nocache(), (req, res) => (
    sponsors.getServer(req, res)
  ));
}

if (stats) {
  server.get('/stats', cors({ origin: allowedOrigins || true }), nocache(), (req, res) => (
    Promise.all([
      stats.getClientsByHour({ room: 'Menu' }),
      stats.getClientsByRoom(),
    ])
      .then(([hour, room]) => (
        res.json({ hour, room })
      ))
  ));
}

server.get('/sync', cors({ origin: allowedOrigins || true }), nocache(), (req, res) => (
  res.end(`${Date.now()}`)
));

server.use((req, res) => res.status(404).end());
server.use((err, req, res, next) => res.status(500).end());
server.listen(process.env.PORT || 3000);
