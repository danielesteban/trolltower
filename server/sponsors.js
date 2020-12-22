const jwt = require('jsonwebtoken');
const { Octokit } = require('@octokit/core');
const { createOAuthAppAuth } = require('@octokit/auth-oauth-app');
const Sequelize = require('sequelize');

const sessionSecret = process.env.SESSION_SECRET || 'superunsecuresecret';
if (process.env.NODE_ENV === 'production' && sessionSecret === 'superunsecuresecret') {
  console.warn('\nSecurity warning:\nYou must provide a random SESSION_SECRET.\n');
}

class Sponsors {
  constructor(storage) {
    if (!process.env.GITHUB_ACCESS_TOKEN) {
      console.warn('\nYou must provide a GITHUB_ACCESS_TOKEN.\n');
      process.exit(1);
    }
    if (!process.env.GITHUB_CLIENT_ID) {
      console.warn('\nYou must provide a GITHUB_CLIENT_ID.\n');
      process.exit(1);
    }
    if (!process.env.GITHUB_CLIENT_SECRET) {
      console.warn('\nYou must provide a GITHUB_CLIENT_SECRET.\n');
      process.exit(1);
    }
    const db = new Sequelize({
      dialect: 'sqlite',
      logging: false,
      storage,
    });
    this.users = db.define('users', {
      login: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true,
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      skin: {
        type: Sequelize.STRING,
      },
      tier: {
        allowNull: false,
        type: Sequelize.NUMBER,
        defaultValue: 0,
      },
    });
    db.sync();
    this.auth = createOAuthAppAuth({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    });
    this.octokit = new Octokit({
      auth: process.env.GITHUB_ACCESS_TOKEN,
    });
  }

  static issueToken(user) {
    return jwt.sign(
      {
        id: user.id,
        name: user.name,
        tier: user.tier,
      },
      sessionSecret,
      { expiresIn: '7d' }
    );
  }

  checkSession(req) {
    const { users } = this;
    return new Promise((resolve) => {
      const [type, token] = (req.headers.authorization || '').split(' ');
      if (type !== 'Bearer' || !token) {
        return resolve(false);
      }
      return jwt.verify(token, sessionSecret, (err, decoded) => (
        resolve(
          err ? false : users
            .findOne({ where: { id: decoded.id, tier: { [Sequelize.Op.not]: 0 } } })
            .catch(() => false)
        )
      ));
    });
  }

  refreshSession(req, res) {
    this.checkSession(req)
      .then((user) => {
        if (!user) {
          return false;
        }
        return Sponsors.issueToken(user);
      })
      .then((session) => res.json(session));
  }

  list(req, res) {
    const { users } = this;
    users.findAll({
      attributes: [
        'name',
        'skin',
        'tier',
      ],
      where: {
        tier: { [Sequelize.Op.not]: 0 },
      },
      order: [
        ['tier', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      raw: true,
    })
      .then((sponsors) => res.json(sponsors.map((user) => ({
        ...user,
        skin: user.skin !== null ? user.skin : undefined,
      }))));
  }

  login(req, res, allowedOrigins) {
    const { code } = req.query;
    const send = (session) => (
      res.send(
        '<script>'
        + 'window.addEventListener("message",({origin,source})=>{'
        + `if(${allowedOrigins ? `~${JSON.stringify(allowedOrigins)}.indexOf(origin)` : 'true'}){`
        + ''
        + `source.postMessage({${(
          !session ? (
            'err:1'
          ) : (
            `session:${JSON.stringify(session)}`
          )
        )}},origin);`
        + 'window.close()'
        + '}'
        + '},false)'
        + '</script>'
      )
    );
    if (!code) {
      return send();
    }
    const { auth, users } = this;
    return auth({
      type: 'token',
      code,
    })
      .then(({ token }) => {
        const octokit = new Octokit({
          auth: token,
        });
        return octokit.request('GET /user')
          .then(({ data: profile }) => (
            users
              .findOne({ where: { login: profile.login } })
              .then((user) => {
                if (user) {
                  return user;
                }
                return users
                  .create({
                    login: profile.login,
                    name: profile.login,
                  });
              })
          ))
          .then((user) => this.updateStatus(user))
          .then((user) => {
            if (!user.tier) {
              return false;
            }
            return Sponsors.issueToken(user);
          });
      })
      .catch(() => false)
      .then(send);
  }

  update(req, res) {
    this.checkSession(req)
      .then((user) => {
        if (!user) {
          throw new Error();
        }
        let { name, skin } = req.body;
        name = `${name || ''}`;
        skin = `${skin || ''}`;
        if (name) {
          user.name = name;
        }
        if (skin) {
          user.skin = skin;
        }
        return user.save();
      })
      .then(() => res.status(200).end())
      .catch(() => res.status(422).end());
  }

  updateStatus(user) {
    const { octokit } = this;
    const query = `query ($owner: String!, $after: String) { 
      user (login: $owner) {
        sponsorshipsAsMaintainer (first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            sponsor {
              login
            }
            tier {
              monthlyPriceInDollars
            }
          }
        }
      }
    }`;
    const getSponsorTier = (user, after) => (
      octokit
        .graphql(query, {
          owner: 'danielesteban',
          after,
        })
        .then((res) => {
          const { nodes, pageInfo } = res.user.sponsorshipsAsMaintainer;
          const node = nodes.find((node) => node.sponsor && node.sponsor.login === user);
          if (node) {
            return Sponsors.tiers[node.tier.monthlyPriceInDollars];
          }
          if (pageInfo.hasNextPage) {
            return getSponsorTier(user, pageInfo.endCursor);
          }
          return 0;
        })
    );
    return getSponsorTier(user.login)
      .then((tier) => {
        if (user.tier === tier) {
          return user;
        }
        user.tier = tier;
        return user.save().then(() => user);
      })
      .catch(() => (false));
  }

  populate(skins) {
    const { octokit, users } = this;
    const query = `query ($owner: String!, $after: String) { 
      user (login: $owner) {
        sponsorshipsAsMaintainer (first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            sponsor {
              login
            }
            tier {
              monthlyPriceInDollars
            }
          }
        }
      }
    }`;
    let skin = 0;
    const populateSponsors = (user, after) => (
      octokit
        .graphql(query, {
          owner: 'danielesteban',
          after,
        })
        .then((res) => {
          const { nodes, pageInfo } = res.user.sponsorshipsAsMaintainer;
          return Promise.all(
            nodes
              .filter((node) => node.sponsor)
              .map(({ sponsor: { login }, tier: { monthlyPriceInDollars } }) => (
                users
                  .findOne({ where: { login } })
                  .then((user) => {
                    if (user) {
                      return user;
                    }
                    skin = (skin + 1) % skins.length;
                    return users
                      .create({
                        login,
                        name: login,
                        ...(skins ? { skin: skins[skin] } : {}),
                      });
                  })
                  .then((user) => {
                    const tier = Sponsors.tiers[monthlyPriceInDollars];
                    if (user.tier === tier) {
                      return false;
                    }
                    user.tier = tier;
                    return user.save();
                  })
              ))
          )
            .then(() => {
              if (!pageInfo.hasNextPage) {
                return false;
              }
              return populateSponsors(user, pageInfo.endCursor);
            });
        })
    );
    populateSponsors();
  }
}

Sponsors.tiers = {
  5: 1,
  10: 2,
  50: 3,
  100: 4,
  500: 5,
};

module.exports = Sponsors;
