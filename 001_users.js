// migrations/001_users.js
exports.up = async function (knex) {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // --- Users ---
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('first_name', 100);
    t.string('last_name', 100);
    t.string('display_name', 100);
    t.string('phone', 20);
    t.string('avatar_url', 500);
    t.string('timezone', 50).defaultTo('America/New_York');
    t.enum('status', ['active', 'suspended', 'deactivated']).defaultTo('active');
    t.enum('role', ['user', 'admin', 'super_admin']).defaultTo('user');
    t.boolean('email_verified').defaultTo(false);
    t.string('email_verification_token', 255);
    t.string('password_reset_token', 255);
    t.timestamp('password_reset_expires');
    t.jsonb('preferences').defaultTo('{}');
    t.jsonb('onboarding_state').defaultTo('{}');
    t.timestamp('last_login_at');
    t.timestamps(true, true);
    t.timestamp('deleted_at');
  });

  // --- Subscription / Billing ---
  await knex.schema.createTable('subscriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enum('plan', ['free', 'pro', 'business', 'enterprise']).defaultTo('free');
    t.enum('status', ['active', 'trialing', 'past_due', 'canceled', 'expired']).defaultTo('active');
    t.string('stripe_customer_id', 255);
    t.string('stripe_subscription_id', 255);
    t.integer('listing_limit').defaultTo(25); // free tier
    t.integer('marketplace_limit').defaultTo(2); // free tier
    t.boolean('ai_features').defaultTo(false);
    t.boolean('automation_features').defaultTo(false);
    t.boolean('bulk_operations').defaultTo(false);
    t.boolean('analytics_advanced').defaultTo(false);
    t.boolean('priority_support').defaultTo(false);
    t.timestamp('trial_ends_at');
    t.timestamp('current_period_start');
    t.timestamp('current_period_end');
    t.timestamps(true, true);
  });

  // --- Refresh Tokens ---
  await knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('token').notNullable().unique();
    t.string('device_info', 500);
    t.string('ip_address', 45);
    t.boolean('revoked').defaultTo(false);
    t.timestamp('expires_at').notNullable();
    t.timestamps(true, true);
  });

  // Indexes
  await knex.schema.raw('CREATE INDEX idx_users_email ON users(email)');
  await knex.schema.raw('CREATE INDEX idx_users_status ON users(status)');
  await knex.schema.raw('CREATE INDEX idx_subscriptions_user ON subscriptions(user_id)');
  await knex.schema.raw('CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id)');
  await knex.schema.raw('CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at)');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('subscriptions');
  await knex.schema.dropTableIfExists('users');
};
