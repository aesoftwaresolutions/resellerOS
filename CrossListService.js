// src/services/inventory/CrossListService.js
const db = require('../../config/database');
const redis = require('../../config/redis');
const ListingModel = require('../../models/Listing');
const ProductModel = require('../../models/Product');
const MarketplaceConnection = require('../../models/MarketplaceConnection');
const logger = require('../../utils/logger');
const { ValidationError, MarketplaceError, NotFoundError } = require('../../utils/errors');

class CrossListService {
  /**
   * Cross-list a single product to one or more marketplaces
   */
  async crossList(userId, productId, marketplaceIds, options = {}) {
    const product = await ProductModel.findWithImages(productId);
    if (!product || product.user_id !== userId) {
      throw new NotFoundError('Product');
    }

    if (!product.images || product.images.length === 0) {
      throw new ValidationError('Product must have at least one image to list');
    }

    // Get user's marketplace connections
    const connections = await MarketplaceConnection.findConnected(userId);
    const connectionMap = {};
    connections.forEach(c => { connectionMap[c.marketplace_id] = c; });

    const results = {
      success: [],
      failed: [],
      skipped: [],
    };

    for (const marketplaceId of marketplaceIds) {
      try {
        // Check if already listed on this marketplace
        const existing = await ListingModel.findOne({
          product_id: productId,
          marketplace_id: marketplaceId,
        });

        if (existing && ['active', 'pending'].includes(existing.status)) {
          results.skipped.push({
            marketplaceId,
            reason: 'Already listed',
            listingId: existing.id,
          });
          continue;
        }

        // Check connection
        const connection = connectionMap[marketplaceId];
        if (!connection) {
          results.failed.push({
            marketplaceId,
            error: 'Marketplace not connected',
          });
          continue;
        }

        // Calculate marketplace-specific pricing
        const listedPrice = options.prices?.[marketplaceId] || product.base_price;
        const feeRate = this._getFeeRate(marketplaceId);
        const estimatedFee = Math.round(listedPrice * feeRate * 100) / 100;
        const estimatedPayout = listedPrice - estimatedFee;

        // Transform product data for marketplace
        const listingData = this._transformForMarketplace(product, marketplaceId, {
          price: listedPrice,
          ...options,
        });

        // Create listing record (pending state)
        const listing = await ListingModel.create({
          product_id: productId,
          user_id: userId,
          marketplace_id: marketplaceId,
          connection_id: connection.id,
          listed_price: listedPrice,
          original_price: product.base_price,
          marketplace_fee: estimatedFee,
          estimated_payout: estimatedPayout,
          status: 'pending',
          auto_delist_on_sale: options.autoDelistOnSale !== false,
          auto_relist: options.autoRelist || false,
          relist_interval_days: options.relistIntervalDays,
          auto_share: options.autoShare || false,
          share_interval_hours: options.shareIntervalHours,
          auto_offer: options.autoOffer || false,
          auto_offer_discount_pct: options.autoOfferDiscountPct,
          marketplace_data: JSON.stringify(listingData),
        });

        // Queue the actual push to marketplace
        await db('automation_tasks').insert({
          user_id: userId,
          type: 'push_listing',
          marketplace_id: marketplaceId,
          listing_id: listing.id,
          product_id: productId,
          status: 'queued',
          payload: JSON.stringify({
            listingData,
            connectionId: connection.id,
          }),
        });

        results.success.push({
          marketplaceId,
          listingId: listing.id,
          listedPrice,
          estimatedPayout,
        });

        logger.info(`Listing queued: ${product.title} → ${marketplaceId} @ $${listedPrice}`, { userId });
      } catch (err) {
        logger.error(`Cross-list failed for ${marketplaceId}:`, err.message);
        results.failed.push({
          marketplaceId,
          error: err.message,
        });
      }
    }

    // Update product status if it was a draft and at least one listing succeeded
    if (product.status === 'draft' && results.success.length > 0) {
      await ProductModel.update(productId, {
        status: 'active',
        first_listed_at: db.fn.now(),
      });
    }

    // Log activity
    await db('activity_log').insert({
      user_id: userId,
      entity_type: 'product',
      entity_id: productId,
      action: 'cross_listed',
      details: JSON.stringify({
        marketplaces: marketplaceIds,
        results: {
          success: results.success.length,
          failed: results.failed.length,
          skipped: results.skipped.length,
        },
      }),
    });

    await redis.cacheInvalidatePattern(`products:${userId}:*`);
    await redis.cacheInvalidatePattern(`listings:${userId}:*`);

    return results;
  }

  /**
   * Bulk cross-list multiple products to multiple marketplaces
   */
  async bulkCrossList(userId, productIds, marketplaceIds, options = {}) {
    const allResults = {
      total: productIds.length,
      processed: 0,
      results: [],
    };

    for (const productId of productIds) {
      try {
        const result = await this.crossList(userId, productId, marketplaceIds, options);
        allResults.results.push({ productId, ...result });
        allResults.processed++;
      } catch (err) {
        allResults.results.push({
          productId,
          success: [],
          failed: [{ error: err.message }],
          skipped: [],
        });
        allResults.processed++;
      }
    }

    return allResults;
  }

  /**
   * Relist a listing (delete and recreate to boost visibility)
   */
  async relist(userId, listingId) {
    const listing = await ListingModel.findByIdOrFail(listingId);
    if (listing.user_id !== userId) throw new NotFoundError('Listing');

    // Queue delist + relist
    await db('automation_tasks').insert([
      {
        user_id: userId,
        type: 'delist',
        marketplace_id: listing.marketplace_id,
        listing_id: listingId,
        product_id: listing.product_id,
        status: 'queued',
        payload: JSON.stringify({ reason: 'relist' }),
      },
      {
        user_id: userId,
        type: 'push_listing',
        marketplace_id: listing.marketplace_id,
        listing_id: listingId,
        product_id: listing.product_id,
        status: 'queued',
        scheduled_for: new Date(Date.now() + 30000), // 30s delay after delist
        payload: JSON.stringify({ reason: 'relist' }),
      },
    ]);

    await ListingModel.update(listingId, {
      times_relisted: db.raw('COALESCE(times_relisted, 0) + 1'),
      last_relisted_at: db.fn.now(),
    });

    // Also bump the product relist counter
    await ProductModel.update(listing.product_id, {
      times_relisted: db.raw('COALESCE(times_relisted, 0) + 1'),
    });

    return { message: 'Relist queued', listingId };
  }

  /**
   * Delist from a specific marketplace
   */
  async delist(userId, listingId) {
    const listing = await ListingModel.findByIdOrFail(listingId);
    if (listing.user_id !== userId) throw new NotFoundError('Listing');

    await ListingModel.update(listingId, { status: 'delisted' });

    await db('automation_tasks').insert({
      user_id: userId,
      type: 'delist',
      marketplace_id: listing.marketplace_id,
      listing_id: listingId,
      product_id: listing.product_id,
      status: 'queued',
      payload: JSON.stringify({
        externalListingId: listing.external_listing_id,
        reason: 'manual_delist',
      }),
    });

    await redis.cacheInvalidatePattern(`listings:${userId}:*`);

    return { message: 'Delist queued', listingId };
  }

  /**
   * Transform product data for marketplace-specific format
   */
  _transformForMarketplace(product, marketplaceId, options) {
    const base = {
      title: product.title,
      description: product.description,
      price: options.price,
      brand: product.brand,
      category: product.category,
      size: product.size,
      color: product.color,
      condition: product.condition,
      images: (product.images || []).map(img => img.url),
      weight_oz: product.weight_oz,
    };

    // Marketplace-specific transformations
    const transforms = {
      ebay: () => ({
        ...base,
        conditionId: this._mapConditionToEbay(product.condition),
        listingFormat: 'FixedPrice',
        duration: 'GTC',
        shippingProfile: product.shipping_profile,
      }),
      poshmark: () => ({
        ...base,
        department: this._mapCategoryToPoshmark(product.category),
        originalPrice: product.base_price * 1.3, // Poshmark shows "retail"
        size: this._mapSizeToPoshmark(product.size, product.category),
      }),
      mercari: () => ({
        ...base,
        shippingPayer: 'seller',
        shipsFrom: options.shipsFrom || 'US',
      }),
      depop: () => ({
        ...base,
        shippingCost: options.shippingCost || 0,
      }),
    };

    return (transforms[marketplaceId] || (() => base))();
  }

  _getFeeRate(marketplaceId) {
    const rates = {
      ebay: 0.1312, poshmark: 0.20, mercari: 0.10,
      depop: 0.10, facebook: 0.05, grailed: 0.09,
    };
    return rates[marketplaceId] || 0.10;
  }

  _mapConditionToEbay(condition) {
    const map = {
      new_with_tags: 1000, new_without_tags: 1500,
      like_new: 2750, good: 3000, fair: 5000, poor: 6000,
    };
    return map[condition] || 3000;
  }

  _mapCategoryToPoshmark(category) {
    // Simplified mapping
    return category || 'Women';
  }

  _mapSizeToPoshmark(size, category) {
    return size || 'OS';
  }
}

module.exports = new CrossListService();
