// src/models/Listing.js
const BaseModel = require('./BaseModel');

class Listing extends BaseModel {
  constructor() {
    super('listings');
  }

  async findByUser(userId, { page = 1, limit = 25, status, marketplaceId, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
    const offset = (page - 1) * limit;

    let query = this.query()
      .join('products', 'listings.product_id', 'products.id')
      .where({ 'listings.user_id': userId });

    if (status) query = query.where({ 'listings.status': status });
    if (marketplaceId) query = query.where({ 'listings.marketplace_id': marketplaceId });

    const countQuery = query.clone().count('listings.id as count').first();

    const dataQuery = query
      .select(
        'listings.*',
        'products.title as product_title',
        'products.brand as product_brand',
        'products.sku as product_sku',
        'products.base_price as product_base_price'
      )
      .orderBy(`listings.${sortBy}`, sortOrder)
      .limit(limit)
      .offset(offset);

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = parseInt(countResult.count, 10);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit), hasMore: page * limit < total };
  }

  async findByProduct(productId) {
    return this.query()
      .where({ product_id: productId })
      .whereNot({ status: 'delisted' });
  }

  async findActiveByProduct(productId) {
    return this.query()
      .where({ product_id: productId, status: 'active' });
  }

  async delistAllForProduct(productId, excludeListingId = null) {
    let query = this.query()
      .where({ product_id: productId, status: 'active' });

    if (excludeListingId) {
      query = query.whereNot({ id: excludeListingId });
    }

    return query.update({
      status: 'delisted',
      updated_at: this.db.fn.now(),
    }).returning('*');
  }

  async findByExternalId(marketplaceId, externalListingId) {
    return this.query()
      .where({ marketplace_id: marketplaceId, external_listing_id: externalListingId })
      .first();
  }

  async getMarketplaceStats(userId) {
    return this.db.raw(`
      SELECT 
        marketplace_id,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'sold') as sold_count,
        COALESCE(AVG(listed_price) FILTER (WHERE status = 'active'), 0) as avg_price,
        COALESCE(SUM(listed_price) FILTER (WHERE status = 'active'), 0) as total_value
      FROM listings
      WHERE user_id = ?
      GROUP BY marketplace_id
    `, [userId]).then(r => r.rows);
  }
}

module.exports = new Listing();
