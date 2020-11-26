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
    });
    db.sync();
  }

  onClient(room) {
    const { clients } = this;
    return clients.create({ room });
  }

  getClientsByHour(room) {
    const { clients } = this;
    return clients.findAll({
      attributes: [
        [Sequelize.literal('strftime("%Y%m%d%H", "createdAt")'), 'date'],
        [Sequelize.literal('COUNT(*)'), 'count'],
      ],
      group: ['date'],
      order: [
        ['createdAt', 'DESC'],
      ],
      where: {
        createdAt: { [Sequelize.Op.gt]: new Date(new Date() - 8 * 24 * 60 * 60 * 1000) },
        room,
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
}

module.exports = Stats;
