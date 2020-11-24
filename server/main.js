const cors = require('cors');
const express = require('express');
const expressWS = require('express-ws');
const helmet = require('helmet');
const nocache = require('nocache');
const Room = require('./room');

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false;
const allowedRooms = process.env.ALLOWED_ROOMS ? process.env.ALLOWED_ROOMS.split(',') : false;

const server = express();
server.use(helmet());
expressWS(server, null, { clientTracking: false });

const rooms = new Map();

server.ws('/:room', (client, req) => {
  if (allowedOrigins && allowedOrigins.indexOf(req.headers.origin) === -1) {
    client.send(JSON.stringify({
      type: 'ERROR',
      data: 'Origin not allowed.',
    }), () => {});
    client.terminate();
    return;
  }
  const { room: id } = req.params;
  if (allowedRooms && allowedRooms.indexOf(id) === -1) {
    client.send(JSON.stringify({
      type: 'ERROR',
      data: 'Room not allowed.',
    }), () => {});
    client.terminate();
    return;
  }
  let room = rooms.get(id);
  if (!room) {
    room = new Room(id);
    rooms.set(id, room);
  }
  room.onClient(client);
});

server.get('/peers', cors({ origin: allowedOrigins || true }), nocache(), (req, res) => {
  const peers = {};
  rooms.forEach(({ id, clients }) => {
    if (clients.length) {
      peers[id] = clients.length;
    }
  });
  res.json(peers);
});

server.use((req, res) => res.status(404).end());
server.listen(process.env.PORT || 3000);
