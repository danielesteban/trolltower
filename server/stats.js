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
      limit: 200,
      where: { room },
      raw: true,
    })
      .then((clients) => (
        clients.map(({ date, count }) => [parseInt(date, 10), count])
      ));
  }
}

module.exports = Stats;
