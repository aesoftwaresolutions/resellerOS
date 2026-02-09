// migrations/002_marketplace_connections.js
exports.up = async function (knex) {
  // --- Supported Marketplaces ---
  await knex.schema.createTable('marketplaces', (t) => {
    t.string('id', 50).primary(); // 'ebay', 'poshmark', 'mercari', 'depop', etc.
    t.string('name', 100).notNullable();
    t.string('logo_url', 500);
    t.enum('integration_type', ['api', 'automation', 'hybrid']).notNullable();
    t.boolean('active').defaultTo(true);
    t.jsonb('supported_categories').defaultTo('[]');
    t.jsonb('fee_structure').defaultTo('{}');
    t.jsonb('listing_requirements').defaultTo('{}');
    t.integer('rate_limit_per_minute').defaultTo(60);
    t.timestamps(true, true);
  });

  // --- User Marketplace Connections ---
  await knex.schema.createTable('marketplace_connections', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('marketplace_id', 50).notNullable().references('id').inTable('marketplaces');
    t.enum('status', ['connected', 'disconnected', 'error', 'pending', 'expired']).defaultTo('pending');
    t.string('marketplace_username', 255);
    t.string('marketplace_user_id', 255);

    // OAuth tokens (encrypted at rest)
    t.text('access_token_encrypted');
    t.text('refresh_token_encrypted');
    t.timestamp('token_expires_at');

    // For automation-based connections (stored cookies/session)
    t.text('session_data_encrypted');

    // Connection health tracking
    t.timestamp('last_sync_at');
    t.string('last_sync_status', 50);
    t.text('last_error');
    t.integer('consecutive_errors').defaultTo(0);

    t.jsonb('settings').defaultTo('{}'); // per-connection settings
    t.timestamps(true, true);

    t.unique(['user_id', 'marketplace_id']);
  });

  // Indexes
  await knex.schema.raw(
    'CREATE INDEX idx_mkt_conn_user ON marketplace_connections(user_id)'
  );
  await knex.schema.raw(
    'CREATE INDEX idx_mkt_conn_status ON marketplace_connections(status)'
  );
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('marketplace_connections');
  await knex.schema.dropTableIfExists('marketplaces');
};
