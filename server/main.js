const cors = require('cors');
const express = require('express');
const expressWS = require('express-ws');
const helmet = require('helmet');
const nocache = require('nocache');
const Room = require('./room');
const Stats = require('./stats');

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false;
const allowedRooms = process.env.ALLOWED_ROOMS ? process.env.ALLOWED_ROOMS.split(',') : false;

const server = express();
server.use(helmet());
expressWS(server, null, { clientTracking: false });

const rooms = new Map();
const stats = process.env.STATS_STORAGE ? new Stats(process.env.STATS_STORAGE) : false;

server.ws('/:room', (client, req) => {
  if (allowedOrigins && allowedOrigins.indexOf(req.headers.origin) === -1) {
    client.send(JSON.stringify({
      type: 'ERROR',
      data: 'Origin not allowed.',
    }), () => {});
    client.terminate();
    return;
  }
  let id;
  let instance;
  let { room: key } = req.params;
  if (key === 'Menu') {
    id = 'Menu';
    let i = 1;
    while (!instance) {
      const room = rooms.get(`${id}:${i}`);
      if (!room || room.clients.length < room.constructor.maxClients) {
        instance = i;
      }
      i += 1;
    }
  } else {
    [id, instance] = `${key}`.split('-');
    id = `${id}`;
    instance = parseInt(`${instance}`, 10);
    if (allowedRooms && allowedRooms.indexOf(id) === -1) {
      client.send(JSON.stringify({
        type: 'ERROR',
        data: 'Room not allowed.',
      }), () => {});
      client.terminate();
      return;
    }
  }
  key = `${id}:${instance}`;
  let room = rooms.get(key);
  if (!room) {
    room = new Room({ id, instance, stats });
    rooms.set(key, room);
  }
  room.onClient(client);
});

server.get('/peers', cors({ origin: allowedOrigins || true }), nocache(), (req, res) => {
  const peers = {};
  rooms.forEach(({ id, instance, clients }) => {
    if (clients.length) {
      let key = `${id}-${instance}`;
      if (id === 'Menu') {
        key = 'Menu';
      }
      peers[key] = (peers[key] || 0) + clients.length;
    }
  });
  res.json(peers);
});

if (stats) {
  server.get('/stats', cors({ origin: allowedOrigins || true }), nocache(), (req, res) => (
    stats.getClientsByHour({ room: 'Menu' })
      .then((clients) => (
        res.json(clients)
      ))
  ));
}

server.use((req, res) => res.status(404).end());
server.listen(process.env.PORT || 3000);
