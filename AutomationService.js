// src/services/automation/AutomationService.js
const db = require('../../config/database');
const redis = require('../../config/redis');
const logger = require('../../utils/logger');

class AutomationService {
  /**
   * Schedule automated shares for all user listings with auto_share enabled
   */
  async scheduleShares(userId) {
    const listings = await db('listings')
      .where({ user_id: userId, status: 'active', auto_share: true })
      .whereRaw(`(
        last_shared_at IS NULL 
        OR last_shared_at < NOW() - INTERVAL '1 hour' * COALESCE(share_interval_hours, 4)
      )`);

    const tasks = listings.map(listing => ({
      user_id: userId,
      type: 'share',
      marketplace_id: listing.marketplace_id,
      listing_id: listing.id,
      product_id: listing.product_id,
      status: 'queued',
      payload: JSON.stringify({
        externalListingId: listing.external_listing_id,
      }),
      scheduled_for: this._getOptimalShareTime(listing.marketplace_id),
    }));

    if (tasks.length > 0) {
      await db('automation_tasks').insert(tasks);
    }

    logger.info(`Scheduled ${tasks.length} shares for user ${userId}`);
    return { scheduled: tasks.length };
  }

  /**
   * Schedule automated offers to likers
   */
  async scheduleOffers(userId) {
    const listings = await db('listings')
      .where({ user_id: userId, status: 'active', auto_offer: true })
      .where('likes', '>', 0);

    const tasks = [];

    for (const listing of listings) {
      const discountPct = listing.auto_offer_discount_pct || 10;
      const offerPrice = Math.round(listing.listed_price * (1 - discountPct / 100) * 100) / 100;

      // Check floor price
      const product = await db('products').where({ id: listing.product_id }).first();
      if (product?.floor_price && offerPrice < product.floor_price) continue;

      tasks.push({
        user_id: userId,
        type: 'send_offer',
        marketplace_id: listing.marketplace_id,
        listing_id: listing.id,
        product_id: listing.product_id,
        status: 'queued',
        payload: JSON.stringify({
          externalListingId: listing.external_listing_id,
          offerPrice,
          discountPct,
        }),
        scheduled_for: this._getOptimalOfferTime(),
      });
    }

    if (tasks.length > 0) {
      await db('automation_tasks').insert(tasks);
    }

    return { scheduled: tasks.length };
  }

  /**
   * Schedule automatic relists
   */
  async scheduleRelists(userId) {
    const listings = await db('listings')
      .where({ user_id: userId, status: 'active', auto_relist: true })
      .whereNotNull('relist_interval_days')
      .whereRaw(`(
        last_relisted_at IS NULL 
        OR last_relisted_at < NOW() - INTERVAL '1 day' * relist_interval_days
      )`);

    const tasks = listings.map(listing => ({
      user_id: userId,
      type: 'relist',
      marketplace_id: listing.marketplace_id,
      listing_id: listing.id,
      product_id: listing.product_id,
      status: 'queued',
      payload: JSON.stringify({
        externalListingId: listing.external_listing_id,
        reason: 'auto_relist',
      }),
    }));

    if (tasks.length > 0) {
      await db('automation_tasks').insert(tasks);
    }

    return { scheduled: tasks.length };
  }

  /**
   * Process queued automation tasks
   */
  async processTask(taskId) {
    const task = await db('automation_tasks').where({ id: taskId }).first();
    if (!task || task.status !== 'queued') return null;

    // Mark as running
    await db('automation_tasks').where({ id: taskId }).update({
      status: 'running',
      started_at: db.fn.now(),
    });

    try {
      let result;

      switch (task.type) {
        case 'push_listing':
          result = await this._executePushListing(task);
          break;
        case 'delist':
          result = await this._executeDelist(task);
          break;
        case 'share':
          result = await this._executeShare(task);
          break;
        case 'send_offer':
          result = await this._executeSendOffer(task);
          break;
        case 'relist':
          result = await this._executeRelist(task);
          break;
        case 'price_update':
          result = await this._executePriceUpdate(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      await db('automation_tasks').where({ id: taskId }).update({
        status: 'completed',
        result: JSON.stringify(result || {}),
        completed_at: db.fn.now(),
      });

      return result;
    } catch (err) {
      logger.error(`Task ${taskId} failed:`, err.message);

      const retryCount = (task.retry_count || 0) + 1;
      const shouldRetry = retryCount < (task.max_retries || 3);

      await db('automation_tasks').where({ id: taskId }).update({
        status: shouldRetry ? 'queued' : 'failed',
        error: err.message,
        retry_count: retryCount,
        scheduled_for: shouldRetry
          ? new Date(Date.now() + Math.pow(2, retryCount) * 60000) // Exponential backoff
          : null,
        completed_at: shouldRetry ? null : db.fn.now(),
      });

      throw err;
    }
  }

  /**
   * Get automation stats for a user
   */
  async getStats(userId, days = 7) {
    const result = await db.raw(`
      SELECT 
        type,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        COUNT(*) as total
      FROM automation_tasks
      WHERE user_id = ?
        AND created_at >= NOW() - INTERVAL '? days'
      GROUP BY type
      ORDER BY type
    `, [userId, days]);

    return result.rows;
  }

  // --- Private execution methods ---

  async _executePushListing(task) {
    const payload = JSON.parse(task.payload || '{}');
    const connection = await db('marketplace_connections')
      .where({ id: payload.connectionId })
      .first();

    if (!connection) throw new Error('Marketplace connection not found');

    const adapter = this._getAdapter(task.marketplace_id);
    const listingData = payload.listingData;

    const result = await adapter.createListing(connection, listingData);

    // Update listing with external ID
    await db('listings').where({ id: task.listing_id }).update({
      external_listing_id: result.externalListingId,
      external_url: result.externalUrl,
      status: 'active',
      last_synced_at: db.fn.now(),
      sync_status: 'synced',
    });

    return result;
  }

  async _executeDelist(task) {
    const payload = JSON.parse(task.payload || '{}');
    const listing = await db('listings').where({ id: task.listing_id }).first();
    if (!listing) return { skipped: true, reason: 'Listing not found' };

    const connection = await db('marketplace_connections')
      .where({ id: listing.connection_id })
      .first();

    if (connection && listing.external_listing_id) {
      const adapter = this._getAdapter(task.marketplace_id);
      await adapter.deleteListing(connection, listing.external_listing_id);
    }

    await db('listings').where({ id: task.listing_id }).update({
      status: 'delisted',
      updated_at: db.fn.now(),
    });

    return { delisted: true };
  }

  async _executeShare(task) {
    const listing = await db('listings').where({ id: task.listing_id }).first();
    if (!listing || listing.status !== 'active') return { skipped: true };

    const connection = await db('marketplace_connections')
      .where({ id: listing.connection_id })
      .first();

    const adapter = this._getAdapter(task.marketplace_id);
    await adapter.shareListing(connection, listing.external_listing_id);

    await db('listings').where({ id: task.listing_id }).update({
      last_shared_at: db.fn.now(),
    });

    await db('products').where({ id: listing.product_id }).update({
      times_shared: db.raw('COALESCE(times_shared, 0) + 1'),
    });

    return { shared: true };
  }

  async _executeSendOffer(task) {
    const payload = JSON.parse(task.payload || '{}');
    const listing = await db('listings').where({ id: task.listing_id }).first();
    if (!listing || listing.status !== 'active') return { skipped: true };

    const connection = await db('marketplace_connections')
      .where({ id: listing.connection_id })
      .first();

    const adapter = this._getAdapter(task.marketplace_id);
    await adapter.sendOffer(connection, listing.external_listing_id, payload.offerPrice);

    return { offerSent: true, price: payload.offerPrice };
  }

  async _executeRelist(task) {
    // Delist then re-create
    await this._executeDelist(task);

    // Small delay before relisting
    await new Promise(r => setTimeout(r, 5000));

    // Re-push the listing
    const listing = await db('listings').where({ id: task.listing_id }).first();
    if (!listing) return { skipped: true };

    await db('listings').where({ id: task.listing_id }).update({
      status: 'pending',
      external_listing_id: null,
      external_url: null,
    });

    // Queue a new push
    await db('automation_tasks').insert({
      user_id: task.user_id,
      type: 'push_listing',
      marketplace_id: task.marketplace_id,
      listing_id: task.listing_id,
      product_id: task.product_id,
      status: 'queued',
      payload: JSON.stringify({
        connectionId: listing.connection_id,
        listingData: JSON.parse(listing.marketplace_data || '{}'),
      }),
    });

    return { relisted: true };
  }

  async _executePriceUpdate(task) {
    const payload = JSON.parse(task.payload || '{}');
    const listing = await db('listings').where({ id: task.listing_id }).first();
    if (!listing) return { skipped: true };

    const connection = await db('marketplace_connections')
      .where({ id: listing.connection_id })
      .first();

    const adapter = this._getAdapter(task.marketplace_id);
    await adapter.updatePrice(connection, listing.external_listing_id, payload.newPrice);

    return { priceUpdated: true, newPrice: payload.newPrice };
  }

  _getAdapter(marketplaceId) {
    try {
      return require(`../marketplace/${marketplaceId}Adapter`);
    } catch {
      return require('../marketplace/BaseMarketplaceAdapter');
    }
  }

  /**
   * Get optimal time to share (based on marketplace peak hours)
   */
  _getOptimalShareTime(marketplaceId) {
    // Peak engagement times vary by platform
    const now = new Date();
    const peakHours = {
      poshmark: [7, 12, 18, 21], // morning, lunch, evening, late night
      mercari: [9, 13, 19],
      ebay: [10, 14, 20],
      depop: [11, 15, 20],
    };

    const hours = peakHours[marketplaceId] || [10, 14, 19];
    const currentHour = now.getHours();

    // Find next peak hour
    let nextPeak = hours.find(h => h > currentHour);
    if (!nextPeak) {
      nextPeak = hours[0]; // Tomorrow's first peak
      now.setDate(now.getDate() + 1);
    }

    now.setHours(nextPeak, Math.floor(Math.random() * 30), 0, 0);
    return now;
  }

  _getOptimalOfferTime() {
    const now = new Date();
    // Send offers in the evening when buyers are most active
    now.setHours(19 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);
    if (now < new Date()) now.setDate(now.getDate() + 1);
    return now;
  }
}

module.exports = new AutomationService();
