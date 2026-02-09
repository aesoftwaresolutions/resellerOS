// src/services/sync/SyncBridge.js
// ═══════════════════════════════════════════════════════
//  Sync Bridge — the glue layer
//
//  Listens for business events (product updated, sale
//  recorded, listing created, etc.) and fans out to:
//    1. Supabase Realtime (instant push to web + iOS)
//    2. Google Sheets (incremental row upsert)
//    3. WebSocket (existing Socket.io for web fallback)
//
//  Usage in any service:
//    const sync = require('./sync/SyncBridge');
//    await sync.emit('product:updated', { product });
// ═══════════════════════════════════════════════════════

const config = require('../../config');
const logger = require('../../utils/logger');

let sheetsSync = null;
let supabase = null;
let wsEmit = null;

class SyncBridge {
  constructor() {
    this.initialized = false;
    this.queue = []; // buffer events until initialized
  }

  /**
   * Initialize all sync targets. Call once at server startup.
   */
  async initialize(socketEmitFn) {
    // WebSocket (existing Socket.io)
    wsEmit = socketEmitFn || (() => {});

    // Google Sheets
    if (config.googleSheets.enabled) {
      try {
        sheetsSync = require('./GoogleSheetsSync');
        const ok = await sheetsSync.initialize();
        if (ok) logger.info('🔗 SyncBridge: Google Sheets connected');
      } catch (err) {
        logger.warn('SyncBridge: Google Sheets init failed:', err.message);
        sheetsSync = null;
      }
    }

    // Supabase Realtime
    if (config.supabase.enabled) {
      try {
        const { broadcastEvent } = require('../../config/supabase');
        supabase = { broadcastEvent };
        logger.info('🔗 SyncBridge: Supabase Realtime connected');
      } catch (err) {
        logger.warn('SyncBridge: Supabase init failed:', err.message);
        supabase = null;
      }
    }

    this.initialized = true;

    // Flush any queued events
    for (const { event, data } of this.queue) {
      await this.emit(event, data);
    }
    this.queue = [];

    logger.info('✅ SyncBridge initialized');
  }

  /**
   * Emit a sync event to all connected targets.
   *
   * Events:
   *   product:created   { product, userId }
   *   product:updated   { product, userId }
   *   product:deleted   { productId, userId }
   *   listing:created   { listing, userId }
   *   listing:updated   { listing, userId }
   *   listing:delisted  { listing, userId }
   *   sale:recorded     { sale, userId }
   *   price:changed     { product, oldPrice, newPrice, userId }
   *   inventory:synced  { summary, userId }
   */
  async emit(event, data) {
    if (!this.initialized) {
      this.queue.push({ event, data });
      return;
    }

    const { userId } = data;
    const [domain, action] = event.split(':');

    // ─── 1. WebSocket (instant, existing clients) ───
    try {
      wsEmit(userId, event, this._sanitize(data));
    } catch (err) {
      logger.debug(`WS emit failed for ${event}: ${err.message}`);
    }

    // ─── 2. Supabase Realtime broadcast ───
    if (supabase) {
      try {
        await supabase.broadcastEvent(
          `user:${userId}`,
          event,
          this._sanitize(data)
        );
      } catch (err) {
        logger.debug(`Supabase broadcast failed for ${event}: ${err.message}`);
      }
    }

    // ─── 3. Google Sheets (incremental push) ───
    if (sheetsSync) {
      try {
        switch (event) {
          case 'product:created':
          case 'product:updated':
            await sheetsSync.pushProductUpdate(data.product);
            break;
          case 'listing:created':
          case 'listing:updated':
          case 'listing:delisted':
            await sheetsSync.pushListingUpdate(data.listing);
            break;
          case 'sale:recorded':
            await sheetsSync.pushSaleCreated(data.sale);
            break;
          case 'price:changed':
            await sheetsSync.pushProductUpdate(data.product);
            break;
          // inventory:synced → do a full listings push
          case 'inventory:synced':
            await sheetsSync.fullSyncListings(userId);
            break;
        }
      } catch (err) {
        logger.warn(`Sheets sync failed for ${event}: ${err.message}`);
        // Non-fatal — Sheet sync is best-effort
      }
    }

    logger.debug(`SyncBridge: ${event} dispatched`);
  }

  /**
   * Strip sensitive fields before broadcasting
   */
  _sanitize(data) {
    const clean = { ...data };
    // Remove anything we don't want going over the wire
    delete clean.userId;
    if (clean.product) {
      clean.product = { ...clean.product };
      // Don't leak internal fields
    }
    return clean;
  }
}

module.exports = new SyncBridge();
