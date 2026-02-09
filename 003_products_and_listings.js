// migrations/003_products_and_listings.js
exports.up = async function (knex) {
  // --- Products (Canonical inventory item) ---
  await knex.schema.createTable('products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Core product info
    t.string('title', 500).notNullable();
    t.text('description');
    t.string('brand', 255);
    t.string('category', 255);
    t.string('subcategory', 255);
    t.string('color', 100);
    t.string('size', 100);
    t.string('condition', 50); // 'new_with_tags', 'new_without_tags', 'like_new', 'good', 'fair', 'poor'
    t.string('material', 255);
    t.specificType('tags', 'text[]'); // array of tags for search

    // Pricing
    t.decimal('cost_price', 10, 2);        // what seller paid
    t.decimal('base_price', 10, 2);         // desired selling price
    t.decimal('floor_price', 10, 2);        // minimum acceptable price
    t.decimal('ai_suggested_price', 10, 2); // AI pricing suggestion

    // Inventory
    t.integer('quantity').defaultTo(1);
    t.integer('quantity_available').defaultTo(1);
    t.string('sku', 100);
    t.string('barcode', 100);
    t.string('location', 255); // physical storage location

    // Sourcing
    t.enum('source_type', ['purchased', 'consignment', 'dropship', 'brand_return', 'thrift', 'wholesale', 'other']).defaultTo('purchased');
    t.string('source_name', 255);
    t.decimal('source_cost', 10, 2);
    t.date('source_date');

    // Status
    t.enum('status', ['draft', 'active', 'sold', 'not_for_sale', 'archived', 'deleted']).defaultTo('draft');

    // Weight / Dimensions for shipping
    t.decimal('weight_oz', 8, 2);
    t.decimal('length_in', 8, 2);
    t.decimal('width_in', 8, 2);
    t.decimal('height_in', 8, 2);
    t.string('shipping_profile', 100);

    // Analytics
    t.integer('total_views').defaultTo(0);
    t.integer('total_likes').defaultTo(0);
    t.integer('times_shared').defaultTo(0);
    t.integer('times_relisted').defaultTo(0);
    t.timestamp('first_listed_at');
    t.integer('days_listed').defaultTo(0);

    // AI metadata
    t.jsonb('ai_metadata').defaultTo('{}'); // demand score, sell-through rate, etc.

    t.jsonb('custom_fields').defaultTo('{}');
    t.timestamps(true, true);
    t.timestamp('deleted_at');
  });

  // --- Product Images ---
  await knex.schema.createTable('product_images', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.string('url', 1000).notNullable();
    t.string('thumbnail_url', 1000);
    t.string('s3_key', 500);
    t.integer('position').defaultTo(0);
    t.boolean('is_primary').defaultTo(false);
    t.integer('width');
    t.integer('height');
    t.integer('file_size');
    t.string('content_type', 50);
    t.timestamps(true, true);
  });

  // --- Listings (Product listed on a specific marketplace) ---
  await knex.schema.createTable('listings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('marketplace_id', 50).notNullable().references('id').inTable('marketplaces');
    t.uuid('connection_id').references('id').inTable('marketplace_connections');

    // Marketplace-specific data
    t.string('external_listing_id', 255); // ID on the marketplace
    t.string('external_url', 1000);       // URL on the marketplace

    // Listing-specific pricing (can differ from product base)
    t.decimal('listed_price', 10, 2).notNullable();
    t.decimal('original_price', 10, 2);   // for "was $X" display
    t.decimal('marketplace_fee', 10, 2);
    t.decimal('estimated_payout', 10, 2);

    // Status
    t.enum('status', [
      'draft',        // created but not pushed
      'pending',      // queued for push
      'active',       // live on marketplace
      'sold',         // sold on this platform
      'delisted',     // removed from marketplace
      'error',        // push/sync error
      'expired',      // listing expired
      'not_for_sale'  // marked as NFS
    ]).defaultTo('draft');

    // Cross-listing tracking
    t.boolean('auto_delist_on_sale').defaultTo(true);
    t.boolean('auto_relist').defaultTo(false);
    t.integer('relist_interval_days');
    t.timestamp('last_relisted_at');

    // Promotion
    t.boolean('auto_share').defaultTo(false);
    t.integer('share_interval_hours');
    t.timestamp('last_shared_at');
    t.boolean('auto_offer').defaultTo(false);
    t.decimal('auto_offer_discount_pct', 5, 2); // e.g., 10.00 for 10% off

    // Marketplace-specific fields (varies by platform)
    t.jsonb('marketplace_data').defaultTo('{}');

    // Sync tracking
    t.timestamp('last_synced_at');
    t.string('sync_status', 50);
    t.text('sync_error');

    // Analytics
    t.integer('views').defaultTo(0);
    t.integer('likes').defaultTo(0);
    t.integer('offers_received').defaultTo(0);

    t.timestamps(true, true);

    t.unique(['product_id', 'marketplace_id']);
  });

  // --- Markdown / Price Rules ---
  await knex.schema.createTable('pricing_rules', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.boolean('active').defaultTo(true);

    // Rule conditions
    t.enum('trigger_type', [
      'days_listed',     // after X days
      'no_likes',        // no engagement after X days
      'scheduled',       // on specific date
      'demand_drop',     // AI demand score drops
      'competitor_price' // competitor undercuts
    ]).notNullable();
    t.jsonb('trigger_conditions').defaultTo('{}');

    // Rule actions
    t.enum('action_type', ['percentage_off', 'fixed_reduction', 'set_price', 'match_lowest']).notNullable();
    t.decimal('action_value', 10, 2);
    t.decimal('price_floor', 10, 2); // never go below this

    // Scope
    t.enum('scope', ['all_listings', 'marketplace', 'category', 'specific_products']).defaultTo('all_listings');
    t.jsonb('scope_filter').defaultTo('{}');

    // Repeat
    t.boolean('one_time').defaultTo(false);
    t.integer('max_applications');
    t.integer('times_applied').defaultTo(0);

    t.timestamps(true, true);
  });

  // Indexes
  await knex.schema.raw('CREATE INDEX idx_products_user ON products(user_id)');
  await knex.schema.raw('CREATE INDEX idx_products_status ON products(status)');
  await knex.schema.raw('CREATE INDEX idx_products_sku ON products(sku)');
  await knex.schema.raw("CREATE INDEX idx_products_search ON products USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,'')))");
  await knex.schema.raw('CREATE INDEX idx_product_images_product ON product_images(product_id)');
  await knex.schema.raw('CREATE INDEX idx_listings_product ON listings(product_id)');
  await knex.schema.raw('CREATE INDEX idx_listings_user ON listings(user_id)');
  await knex.schema.raw('CREATE INDEX idx_listings_marketplace ON listings(marketplace_id)');
  await knex.schema.raw('CREATE INDEX idx_listings_status ON listings(status)');
  await knex.schema.raw('CREATE INDEX idx_listings_external ON listings(external_listing_id)');
  await knex.schema.raw('CREATE INDEX idx_pricing_rules_user ON pricing_rules(user_id)');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('pricing_rules');
  await knex.schema.dropTableIfExists('listings');
  await knex.schema.dropTableIfExists('product_images');
  await knex.schema.dropTableIfExists('products');
};
