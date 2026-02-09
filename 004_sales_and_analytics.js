// migrations/004_sales_and_analytics.js
exports.up = async function (knex) {
  // --- Sales / Orders ---
  await knex.schema.createTable('sales', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('products');
    t.uuid('listing_id').references('id').inTable('listings');
    t.string('marketplace_id', 50).references('id').inTable('marketplaces');

    // Sale details
    t.string('external_order_id', 255);
    t.decimal('sale_price', 10, 2).notNullable();
    t.decimal('marketplace_fee', 10, 2).defaultTo(0);
    t.decimal('shipping_cost', 10, 2).defaultTo(0);
    t.decimal('tax_collected', 10, 2).defaultTo(0);
    t.decimal('net_payout', 10, 2);
    t.decimal('profit', 10, 2); // net_payout - cost_price

    // Buyer
    t.string('buyer_username', 255);
    t.jsonb('buyer_info').defaultTo('{}');
    t.jsonb('shipping_address').defaultTo('{}');

    // Status
    t.enum('status', [
      'pending',
      'confirmed',
      'shipped',
      'delivered',
      'completed',
      'canceled',
      'returned',
      'disputed'
    ]).defaultTo('pending');

    // Shipping
    t.string('tracking_number', 255);
    t.string('carrier', 100);
    t.timestamp('shipped_at');
    t.timestamp('delivered_at');

    // Timestamps
    t.timestamp('sold_at').notNullable().defaultTo(knex.fn.now());
    t.timestamps(true, true);
  });

  // --- Activity / Audit Log ---
  await knex.schema.createTable('activity_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('entity_type', 50).notNullable(); // 'product', 'listing', 'sale', etc.
    t.uuid('entity_id');
    t.string('action', 100).notNullable(); // 'created', 'listed', 'sold', 'price_changed', etc.
    t.string('marketplace_id', 50);
    t.jsonb('details').defaultTo('{}'); // action-specific data
    t.string('ip_address', 45);
    t.string('user_agent', 500);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // --- Inventory Sync Log ---
  await knex.schema.createTable('sync_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('connection_id').references('id').inTable('marketplace_connections');
    t.string('marketplace_id', 50);
    t.enum('sync_type', ['full', 'incremental', 'sale_delist', 'price_update', 'status_update']).notNullable();
    t.enum('direction', ['push', 'pull']).notNullable();
    t.enum('status', ['started', 'completed', 'failed', 'partial']).defaultTo('started');
    t.integer('items_processed').defaultTo(0);
    t.integer('items_succeeded').defaultTo(0);
    t.integer('items_failed').defaultTo(0);
    t.jsonb('errors').defaultTo('[]');
    t.integer('duration_ms');
    t.timestamp('started_at').defaultTo(knex.fn.now());
    t.timestamp('completed_at');
    t.timestamps(true, true);
  });

  // --- Automation Tasks ---
  await knex.schema.createTable('automation_tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('type', 100).notNullable(); // 'share', 'relist', 'send_offer', 'price_drop', etc.
    t.string('marketplace_id', 50);
    t.uuid('listing_id');
    t.uuid('product_id');
    t.enum('status', ['queued', 'running', 'completed', 'failed', 'canceled']).defaultTo('queued');
    t.jsonb('payload').defaultTo('{}');
    t.jsonb('result').defaultTo('{}');
    t.text('error');
    t.timestamp('scheduled_for');
    t.timestamp('started_at');
    t.timestamp('completed_at');
    t.integer('retry_count').defaultTo(0);
    t.integer('max_retries').defaultTo(3);
    t.timestamps(true, true);
  });

  // --- Daily Analytics Snapshot ---
  await knex.schema.createTable('analytics_daily', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('date').notNullable();
    t.string('marketplace_id', 50); // null = aggregate across all

    // Metrics
    t.integer('active_listings').defaultTo(0);
    t.integer('new_listings').defaultTo(0);
    t.integer('items_sold').defaultTo(0);
    t.decimal('revenue', 12, 2).defaultTo(0);
    t.decimal('fees', 10, 2).defaultTo(0);
    t.decimal('net_revenue', 12, 2).defaultTo(0);
    t.decimal('profit', 12, 2).defaultTo(0);
    t.integer('total_views').defaultTo(0);
    t.integer('total_likes').defaultTo(0);
    t.integer('offers_received').defaultTo(0);
    t.integer('shares_performed').defaultTo(0);
    t.integer('relists_performed').defaultTo(0);

    t.timestamps(true, true);
    t.unique(['user_id', 'date', 'marketplace_id']);
  });

  // Indexes
  await knex.schema.raw('CREATE INDEX idx_sales_user ON sales(user_id)');
  await knex.schema.raw('CREATE INDEX idx_sales_product ON sales(product_id)');
  await knex.schema.raw('CREATE INDEX idx_sales_marketplace ON sales(marketplace_id)');
  await knex.schema.raw('CREATE INDEX idx_sales_status ON sales(status)');
  await knex.schema.raw('CREATE INDEX idx_sales_sold_at ON sales(sold_at)');
  await knex.schema.raw('CREATE INDEX idx_activity_user ON activity_log(user_id)');
  await knex.schema.raw('CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id)');
  await knex.schema.raw('CREATE INDEX idx_activity_created ON activity_log(created_at)');
  await knex.schema.raw('CREATE INDEX idx_sync_log_user ON sync_log(user_id)');
  await knex.schema.raw('CREATE INDEX idx_automation_user ON automation_tasks(user_id)');
  await knex.schema.raw('CREATE INDEX idx_automation_status ON automation_tasks(status)');
  await knex.schema.raw('CREATE INDEX idx_automation_scheduled ON automation_tasks(scheduled_for)');
  await knex.schema.raw('CREATE INDEX idx_analytics_user_date ON analytics_daily(user_id, date)');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('analytics_daily');
  await knex.schema.dropTableIfExists('automation_tasks');
  await knex.schema.dropTableIfExists('sync_log');
  await knex.schema.dropTableIfExists('activity_log');
  await knex.schema.dropTableIfExists('sales');
};
