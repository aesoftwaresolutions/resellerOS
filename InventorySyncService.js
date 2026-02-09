// src/services/inventory/InventorySyncService.js
const db = require('../../config/database');
const redis = require('../../config/redis');
const ListingModel = require('../../models/Listing');
const ProductModel = require('../../models/Product');
const MarketplaceConnection = require('../../models/MarketplaceConnection');
const logger = require('../../utils/logger');
const { MarketplaceError, NotFoundError } = require('../../utils/errors');

class InventorySyncService {
  /**
   * Handle a sale event - delist from all other marketplaces
   * This is the critical path for preventing double-selling
   */
  async handleSaleEvent(userId, { productId, listingId, marketplaceId, salePrice, buyerInfo, externalOrderId }) {
    const trx = await db.transaction();

    try {
      logger.info(`Sale detected: product=${productId}, marketplace=${marketplaceId}`, { userId });

      // 1. Mark the listing as sold
      await trx('listings')
        .where({ id: listingId })
        .update({
          status: 'sold',
          updated_at: trx.fn.now(),
        });

      // 2. Update product quantity
      const product = await trx('products').where({ id: productId }).first();
      if (!product) throw new NotFoundError('Product');

      const newQty = Math.max((product.quantity_available || 1) - 1, 0);
      const productUpdate = {
        quantity_available: newQty,
        updated_at: trx.fn.now(),
      };

      // If no more quantity, mark product as sold
      if (newQty <= 0) {
        productUpdate.status = 'sold';
      }

      await trx('products').where({ id: productId }).update(productUpdate);

      // 3. Auto-delist from ALL other marketplaces if quantity is 0
      let delistedListings = [];
      if (newQty <= 0) {
        delistedListings = await trx('listings')
          .where({ product_id: productId, status: 'active' })
          .whereNot({ id: listingId })
          .update({
            status: 'delisted',
            updated_at: trx.fn.now(),
          })
          .returning('*');
      }

      // 4. Create sale record
      const costPrice = product.cost_price || 0;
      const marketplaceFees = this._estimateMarketplaceFee(marketplaceId, salePrice);
      const netPayout = salePrice - marketplaceFees;
      const profit = netPayout - costPrice;

      const [sale] = await trx('sales').insert({
        user_id: userId,
        product_id: productId,
        listing_id: listingId,
        marketplace_id: marketplaceId,
        external_order_id: externalOrderId,
        sale_price: salePrice,
        marketplace_fee: marketplaceFees,
        net_payout: netPayout,
        profit: profit,
        buyer_username: buyerInfo?.username,
        buyer_info: JSON.stringify(buyerInfo || {}),
        status: 'confirmed',
        sold_at: trx.fn.now(),
      }).returning('*');

      // 5. Log the sync activity
      await trx('sync_log').insert({
        user_id: userId,
        marketplace_id: marketplaceId,
        sync_type: 'sale_delist',
        direction: 'pull',
        status: 'completed',
        items_processed: delistedListings.length + 1,
        items_succeeded: delistedListings.length + 1,
        items_failed: 0,
        duration_ms: 0,
      });

      // 6. Activity log
      await trx('activity_log').insert({
        user_id: userId,
        entity_type: 'sale',
        entity_id: sale.id,
        action: 'sold',
        marketplace_id: marketplaceId,
        details: JSON.stringify({
          productTitle: product.title,
          salePrice,
          profit,
          delistedFrom: delistedListings.map(l => l.marketplace_id),
        }),
      });

      await trx.commit();

      // 7. Queue actual delist API calls to other marketplaces
      for (const listing of delistedListings) {
        await this._queueDelistTask(userId, listing);
      }

      // 8. Invalidate caches
      await redis.cacheInvalidatePattern(`products:${userId}:*`);
      await redis.cacheInvalidatePattern(`listings:${userId}:*`);
      await redis.cacheInvalidatePattern(`analytics:${userId}:*`);

      logger.info(`Sale processed: ${product.title} on ${marketplaceId} for $${salePrice}. Delisted from ${delistedListings.length} other platforms.`, { userId });

      return { sale, delistedCount: delistedListings.length };
    } catch (err) {
      await trx.rollback();
      logger.error('Sale handling failed:', { error: err.message, productId, marketplaceId });
      throw err;
    }
  }

  /**
   * Full sync - pull all active listings from a marketplace and reconcile
   */
  async fullSync(userId, connectionId) {
    const connection = await MarketplaceConnection.findByIdOrFail(connectionId);
    if (connection.user_id !== userId) throw new NotFoundError('Connection');

    const syncLog = await db('sync_log').insert({
      user_id: userId,
      connection_id: connectionId,
      marketplace_id: connection.marketplace_id,
      sync_type: 'full',
      direction: 'pull',
      status: 'started',
      started_at: db.fn.now(),
    }).returning('*').then(r => r[0]);

    try {
      // Get marketplace adapter
      const adapter = this._getMarketplaceAdapter(connection.marketplace_id);

      // Pull listings from marketplace
      const externalListings = await adapter.getActiveListings(connection);

      let processed = 0, succeeded = 0, failed = 0;
      const errors = [];

      for (const extListing of externalListings) {
        processed++;
        try {
          await this._reconcileListing(userId, connection, extListing);
          succeeded++;
        } catch (err) {
          failed++;
          errors.push({ externalId: extListing.id, error: err.message });
          logger.warn(`Sync failed for listing ${extListing.id}:`, err.message);
        }
      }

      // Update sync log
      const endTime = new Date();
      await db('sync_log').where({ id: syncLog.id }).update({
        status: failed > 0 ? 'partial' : 'completed',
        items_processed: processed,
        items_succeeded: succeeded,
        items_failed: failed,
        errors: JSON.stringify(errors),
        completed_at: endTime,
        duration_ms: endTime.getTime() - new Date(syncLog.started_at).getTime(),
      });

      // Update connection status
      await MarketplaceConnection.updateSyncStatus(connectionId, 'success');

      await redis.cacheInvalidatePattern(`products:${userId}:*`);
      await redis.cacheInvalidatePattern(`listings:${userId}:*`);

      return { processed, succeeded, failed, errors };
    } catch (err) {
      await db('sync_log').where({ id: syncLog.id }).update({
        status: 'failed',
        errors: JSON.stringify([{ error: err.message }]),
        completed_at: db.fn.now(),
      });

      await MarketplaceConnection.updateSyncStatus(connectionId, 'error', err.message);
      throw err;
    }
  }

  /**
   * Price sync - push updated prices to a marketplace
   */
  async syncPrices(userId, marketplaceId, listings) {
    const adapter = this._getMarketplaceAdapter(marketplaceId);
    const results = { updated: 0, failed: 0, errors: [] };

    for (const listing of listings) {
      try {
        await adapter.updatePrice(listing.external_listing_id, listing.listed_price);
        await ListingModel.update(listing.id, {
          last_synced_at: db.fn.now(),
          sync_status: 'synced',
        });
        results.updated++;
      } catch (err) {
        results.failed++;
        results.errors.push({ listingId: listing.id, error: err.message });
        await ListingModel.update(listing.id, {
          sync_status: 'error',
          sync_error: err.message,
        });
      }
    }

    return results;
  }

  /**
   * Reconcile external listing with internal data
   */
  async _reconcileListing(userId, connection, externalListing) {
    // Try to find existing listing by external ID
    const existing = await ListingModel.findByExternalId(
      connection.marketplace_id,
      externalListing.id
    );

    if (existing) {
      // Update with latest data from marketplace
      await ListingModel.update(existing.id, {
        listed_price: externalListing.price,
        views: externalListing.views || existing.views,
        likes: externalListing.likes || existing.likes,
        marketplace_data: JSON.stringify(externalListing.rawData || {}),
        last_synced_at: db.fn.now(),
        sync_status: 'synced',
      });

      // Check if sold on marketplace
      if (externalListing.status === 'sold' && existing.status === 'active') {
        await this.handleSaleEvent(userId, {
          productId: existing.product_id,
          listingId: existing.id,
          marketplaceId: connection.marketplace_id,
          salePrice: externalListing.soldPrice || externalListing.price,
          buyerInfo: externalListing.buyer,
          externalOrderId: externalListing.orderId,
        });
      }
    }
    // If no existing listing found, it may be a listing not created through our platform
    // We could optionally import it as an unmatched listing
  }

  /**
   * Queue a delist task for async processing
   */
  async _queueDelistTask(userId, listing) {
    await db('automation_tasks').insert({
      user_id: userId,
      type: 'delist',
      marketplace_id: listing.marketplace_id,
      listing_id: listing.id,
      product_id: listing.product_id,
      status: 'queued',
      payload: JSON.stringify({
        externalListingId: listing.external_listing_id,
        reason: 'sold_on_other_platform',
      }),
    });
  }

  /**
   * Estimate marketplace fees based on platform
   */
  _estimateMarketplaceFee(marketplaceId, salePrice) {
    const feeRates = {
      ebay: 0.1312,     // ~13.12% (varies by category)
      poshmark: 0.20,   // 20% flat
      mercari: 0.10,    // 10%
      depop: 0.10,      // 10%
      facebook: 0.05,   // 5%
      grailed: 0.09,    // 9%
      tradesy: 0.1975,  // 19.75%
      kidizen: 0.12,    // 12%
      vestiaire: 0.15,  // 15%
    };

    const rate = feeRates[marketplaceId] || 0.10;
    return Math.round(salePrice * rate * 100) / 100;
  }

  /**
   * Get the appropriate marketplace adapter
   */
  _getMarketplaceAdapter(marketplaceId) {
    // Dynamic adapter loading - each marketplace has its own adapter
    try {
      return require(`../marketplace/${marketplaceId}Adapter`);
    } catch (err) {
      logger.warn(`No adapter found for marketplace: ${marketplaceId}`);
      return require('../marketplace/BaseMarketplaceAdapter');
    }
  }
}

module.exports = new InventorySyncService();
