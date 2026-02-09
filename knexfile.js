// src/config/knexfile.js
const config = require('./index');

const baseConfig = {
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
  },
  pool: config.db.pool,
  migrations: {
    directory: '../../migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: '../../seeds',
  },
};

module.exports = {
  development: { ...baseConfig },
  staging: { ...baseConfig, pool: { min: 2, max: 10 } },
  production: {
    ...baseConfig,
    pool: { min: 5, max: 30 },
    connection: {
      ...baseConfig.connection,
      ssl: { rejectUnauthorized: false },
    },
  },
};
