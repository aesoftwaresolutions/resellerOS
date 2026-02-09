// src/config/database.js
const knex = require('knex');
const config = require('./index');
const knexConfig = require('./knexfile');
const logger = require('../utils/logger');

const db = knex(knexConfig[config.app.env] || knexConfig.development);

// Test connection on startup
db.raw('SELECT 1')
  .then(() => logger.info('✅ PostgreSQL connected'))
  .catch((err) => {
    logger.error('❌ PostgreSQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = db;
