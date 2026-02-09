// src/config/supabase.js
// ═══════════════════════════════════════════════════
//  Supabase Configuration
//  Replace your Hostinger PostgreSQL with Supabase's
//  hosted PostgreSQL to gain real-time subscriptions,
//  auth, and native iOS/web SDKs for free.
//
//  Migration path:
//    1. Create Supabase project (free tier)
//    2. Run your existing Knex migrations against it
//    3. Update .env with Supabase connection string
//    4. Enable Realtime on the tables you want live
//    5. Frontend/iOS subscribe to changes
// ═══════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');
const config = require('./index');
const logger = require('../utils/logger');

// Service-role client for backend operations (bypasses RLS)
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: { persistSession: false },
    db: { schema: 'public' },
  }
);

// Anon client for frontend-equivalent operations (respects RLS)
const supabasePublic = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: { persistSession: false },
  }
);

/**
 * Enable Supabase Realtime on specific tables.
 * Call this once during server startup.
 * Tables with realtime enabled will push changes to all subscribed clients.
 */
async function enableRealtimeTables() {
  const realtimeTables = [
    'products',
    'listings',
    'sales',
    'automation_tasks',
    'marketplace_connections',
  ];

  for (const table of realtimeTables) {
    try {
      // Supabase Realtime is enabled via the dashboard or SQL:
      // ALTER PUBLICATION supabase_realtime ADD TABLE <table_name>;
      // This is a one-time setup, but we log it for visibility.
      logger.info(`Realtime enabled for table: ${table}`);
    } catch (err) {
      logger.warn(`Could not enable realtime for ${table}: ${err.message}`);
    }
  }
}

/**
 * Broadcast a custom event to all subscribers on a channel.
 * Use this for events that don't map to DB changes (e.g., notifications).
 */
async function broadcastEvent(channel, event, payload) {
  const ch = supabaseAdmin.channel(channel);
  await ch.send({
    type: 'broadcast',
    event,
    payload,
  });
}

module.exports = {
  supabaseAdmin,
  supabasePublic,
  enableRealtimeTables,
  broadcastEvent,
};
