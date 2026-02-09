// src/models/MarketplaceConnection.js
const BaseModel = require('./BaseModel');

class MarketplaceConnection extends BaseModel {
  constructor() {
    super('marketplace_connections');
  }

  async findByUser(userId) {
    return this.query()
      .join('marketplaces', 'marketplace_connections.marketplace_id', 'marketplaces.id')
      .where({ user_id: userId })
      .select(
        'marketplace_connections.*',
        'marketplaces.name as marketplace_name',
        'marketplaces.logo_url',
        'marketplaces.integration_type'
      );
  }

  async findUserConnection(userId, marketplaceId) {
    return this.query()
      .where({ user_id: userId, marketplace_id: marketplaceId })
      .first();
  }

  async findConnected(userId) {
    return this.query()
      .where({ user_id: userId, status: 'connected' });
  }

  async updateSyncStatus(connectionId, status, error = null) {
    return this.update(connectionId, {
      last_sync_at: this.db.fn.now(),
      last_sync_status: status,
      last_error: error,
      consecutive_errors: status === 'error'
        ? this.db.raw('consecutive_errors + 1')
        : 0,
    });
  }
}

module.exports = new MarketplaceConnection();
