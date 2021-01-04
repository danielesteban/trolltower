const Sequelize = require('sequelize');

class Stats {
  constructor(storage) {
    const db = new Sequelize({
      dialect: 'sqlite',
      logging: false,
      storage,
    });
    this.db = db;
    this.clients = db.define('clients', {
      room: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      instance: {
        allowNull: false,
        type: Sequelize.NUMBER,
      },
    });
    db.sync();
  }

  static getDateOffset(days) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, now.getHours());
  }

  onClient({ id, instance }) {
    const { clients } = this;
    return clients.create({ room: id, instance });
  }

  getClientsByHour(where) {
    const { clients } = this;
    return clients.findAll({
      attributes: [
        [Sequelize.literal('strftime("%Y%m%d%H", "createdAt")'), 'date'],
        [Sequelize.literal('COUNT(*)'), 'count'],
      ],
      group: ['date'],
      where: {
        createdAt: { [Sequelize.Op.gt]: Stats.getDateOffset(2) },
        ...where,
      },
      raw: true,
    })
      .then((clients) => (
        clients.reduce((clients, { date, count }) => {
          clients[date] = count;
          return clients;
        }, {})
      ));
  }

  getClientsByDay(where) {
    const { clients } = this;
    return clients.findAll({
      attributes: [
        [Sequelize.literal('strftime("%Y%m%d", "createdAt")'), 'date'],
        [Sequelize.literal('COUNT(*)'), 'count'],
      ],
      group: ['date'],
      where: {
        createdAt: { [Sequelize.Op.gt]: Stats.getDateOffset(14) },
        ...where,
      },
      raw: true,
    })
      .then((clients) => (
        clients.reduce((clients, { date, count }) => {
          clients[date] = count;
          return clients;
        }, {})
      ));
  }

  getClientsByRoom() {
    const { clients } = this;
    return clients.findAll({
      attributes: [
        'room',
        [Sequelize.literal('COUNT(*)'), 'count'],
      ],
      group: ['room'],
      where: {
        createdAt: { [Sequelize.Op.gt]: Stats.getDateOffset(7) },
        room: { [Sequelize.Op.not]: 'Menu' },
      },
      raw: true,
    })
      .then((clients) => (
        clients.reduce((clients, { room, count }) => {
          clients[room] = count;
          return clients;
        }, {})
      ));
  }
}

module.exports = Stats;
