// src/models/Product.js
const BaseModel = require('./BaseModel');

class Product extends BaseModel {
  constructor() {
    super('products');
  }

  async findByUser(userId, { page = 1, limit = 25, status, category, search, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
    const offset = (page - 1) * limit;

    let query = this.query()
      .where({ user_id: userId })
      .whereNull('deleted_at');

    if (status) query = query.where({ status });
    if (category) query = query.where({ category });

    if (search) {
      query = query.where(function () {
        this.where('title', 'ilike', `%${search}%`)
          .orWhere('brand', 'ilike', `%${search}%`)
          .orWhere('sku', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`);
      });
    }

    const countQuery = query.clone().count('id as count').first();
    const dataQuery = query
      .select('*')
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = parseInt(countResult.count, 10);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit), hasMore: page * limit < total };
  }

  async findWithListings(productId) {
    const product = await this.findByIdOrFail(productId);
    const images = await this.db('product_images')
      .where({ product_id: productId })
      .orderBy('position');
    const listings = await this.db('listings')
      .where({ product_id: productId })
      .whereNot({ status: 'delisted' });

    return { ...product, images, listings };
  }

  async findWithImages(productId) {
    const product = await this.findByIdOrFail(productId);
    const images = await this.db('product_images')
      .where({ product_id: productId })
      .orderBy('position');
    return { ...product, images };
  }

  async updateQuantity(productId, soldQuantity = 1) {
    return this.db.raw(`
      UPDATE products 
      SET quantity_available = GREATEST(quantity_available - ?, 0),
          updated_at = NOW()
      WHERE id = ?
      RETURNING *
    `, [soldQuantity, productId]);
  }

  async markAsSold(productId) {
    return this.update(productId, {
      status: 'sold',
      quantity_available: 0,
    });
  }

  async getStats(userId) {
    const stats = await this.db.raw(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'sold') as sold_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'not_for_sale') as nfs_count,
        COALESCE(SUM(base_price) FILTER (WHERE status = 'active'), 0) as active_value,
        COALESCE(AVG(base_price) FILTER (WHERE status = 'active'), 0) as avg_price,
        COALESCE(AVG(days_listed) FILTER (WHERE status = 'active'), 0) as avg_days_listed
      FROM products
      WHERE user_id = ? AND deleted_at IS NULL
    `, [userId]);

    return stats.rows[0];
  }
}

module.exports = new Product();
