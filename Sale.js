// src/models/Sale.js
const BaseModel = require('./BaseModel');

class Sale extends BaseModel {
  constructor() {
    super('sales');
  }

  async findByUser(userId, { page = 1, limit = 25, status, marketplaceId, dateFrom, dateTo } = {}) {
    const offset = (page - 1) * limit;

    let query = this.query()
      .join('products', 'sales.product_id', 'products.id')
      .where({ 'sales.user_id': userId });

    if (status) query = query.where({ 'sales.status': status });
    if (marketplaceId) query = query.where({ 'sales.marketplace_id': marketplaceId });
    if (dateFrom) query = query.where('sales.sold_at', '>=', dateFrom);
    if (dateTo) query = query.where('sales.sold_at', '<=', dateTo);

    const countQuery = query.clone().count('sales.id as count').first();

    const dataQuery = query
      .select(
        'sales.*',
        'products.title as product_title',
        'products.brand as product_brand',
        'products.cost_price'
      )
      .orderBy('sales.sold_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = parseInt(countResult.count, 10);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit), hasMore: page * limit < total };
  }

  async getSummary(userId, { dateFrom, dateTo } = {}) {
    let query = this.db.raw(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(sale_price), 0) as total_revenue,
        COALESCE(SUM(marketplace_fee), 0) as total_fees,
        COALESCE(SUM(shipping_cost), 0) as total_shipping,
        COALESCE(SUM(net_payout), 0) as total_net,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(AVG(sale_price), 0) as avg_sale_price,
        COALESCE(AVG(profit), 0) as avg_profit
      FROM sales
      WHERE user_id = ?
        ${dateFrom ? "AND sold_at >= '" + dateFrom + "'" : ''}
        ${dateTo ? "AND sold_at <= '" + dateTo + "'" : ''}
        AND status NOT IN ('canceled', 'returned')
    `, [userId]);

    const result = await query;
    return result.rows[0];
  }
}

module.exports = new Sale();
