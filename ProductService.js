// src/services/ProductService.js
const db = require('../config/database');
const ProductModel = require('../models/Product');
const ListingModel = require('../models/Listing');
const redis = require('../config/redis');
const SyncBridge = require('./sync/SyncBridge');
const { NotFoundError, AuthorizationError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

class ProductService {
  /**
   * Create a new product
   */
  async create(userId, data) {
    const product = await ProductModel.create({
      user_id: userId,
      title: data.title,
      description: data.description,
      brand: data.brand,
      category: data.category,
      subcategory: data.subcategory,
      color: data.color,
      size: data.size,
      condition: data.condition,
      material: data.material,
      tags: data.tags || [],
      cost_price: data.costPrice,
      base_price: data.basePrice,
      floor_price: data.floorPrice,
      quantity: data.quantity || 1,
      quantity_available: data.quantity || 1,
      sku: data.sku || this._generateSku(),
      barcode: data.barcode,
      location: data.location,
      source_type: data.sourceType || 'purchased',
      source_name: data.sourceName,
      source_cost: data.sourceCost,
      source_date: data.sourceDate,
      weight_oz: data.weightOz,
      length_in: data.lengthIn,
      width_in: data.widthIn,
      height_in: data.heightIn,
      shipping_profile: data.shippingProfile,
      custom_fields: data.customFields || {},
      status: data.status || 'draft',
    });

    // Add images if provided
    if (data.images && data.images.length > 0) {
      const imageRows = data.images.map((img, i) => ({
        product_id: product.id,
        url: img.url,
        thumbnail_url: img.thumbnailUrl,
        s3_key: img.s3Key,
        position: i,
        is_primary: i === 0,
        width: img.width,
        height: img.height,
        file_size: img.fileSize,
        content_type: img.contentType,
      }));
      await db('product_images').insert(imageRows);
    }

    // Log activity
    await this._logActivity(userId, 'product', product.id, 'created', { title: product.title });

    // Invalidate cache
    await redis.cacheInvalidatePattern(`products:${userId}:*`);

    const result = await ProductModel.findWithImages(product.id);

    // Sync to Sheets + Supabase Realtime
    SyncBridge.emit('product:created', { product: result, userId }).catch(() => {});

    return result;
  }

  /**
   * Get products for a user with filtering/search
   */
  async list(userId, filters = {}) {
    const cacheKey = `products:${userId}:${JSON.stringify(filters)}`;
    const cached = await redis.cacheGet(cacheKey);
    if (cached) return cached;

    const result = await ProductModel.findByUser(userId, filters);

    // Attach primary image to each product
    if (result.data.length > 0) {
      const productIds = result.data.map((p) => p.id);
      const images = await db('product_images')
        .whereIn('product_id', productIds)
        .where({ is_primary: true });

      const imageMap = {};
      images.forEach((img) => { imageMap[img.product_id] = img; });

      result.data = result.data.map((p) => ({
        ...p,
        primary_image: imageMap[p.id] || null,
      }));
    }

    await redis.cacheSet(cacheKey, result, 60); // 1 min cache
    return result;
  }

  /**
   * Get single product with all details
   */
  async getById(userId, productId) {
    const product = await ProductModel.findWithListings(productId);
    if (product.user_id !== userId) {
      throw new AuthorizationError('Not your product');
    }
    return product;
  }

  /**
   * Update a product
   */
  async update(userId, productId, data) {
    const product = await ProductModel.findByIdOrFail(productId);
    if (product.user_id !== userId) {
      throw new AuthorizationError('Not your product');
    }

    const updateData = {};
    const allowedFields = [
      'title', 'description', 'brand', 'category', 'subcategory',
      'color', 'size', 'condition', 'material', 'tags',
      'base_price', 'floor_price', 'cost_price', 'quantity', 'quantity_available',
      'sku', 'barcode', 'location', 'source_type', 'source_name',
      'weight_oz', 'length_in', 'width_in', 'height_in', 'shipping_profile',
      'status', 'custom_fields',
    ];

    // Map camelCase to snake_case and filter allowed fields
    const fieldMap = {
      costPrice: 'cost_price', basePrice: 'base_price', floorPrice: 'floor_price',
      quantityAvailable: 'quantity_available', sourceType: 'source_type',
      sourceName: 'source_name', weightOz: 'weight_oz', lengthIn: 'length_in',
      widthIn: 'width_in', heightIn: 'height_in', shippingProfile: 'shipping_profile',
      customFields: 'custom_fields',
    };

    for (const [key, value] of Object.entries(data)) {
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updateData[dbField] = value;
      }
    }

    const updated = await ProductModel.update(productId, updateData);

    await this._logActivity(userId, 'product', productId, 'updated', { changes: Object.keys(updateData) });
    await redis.cacheInvalidatePattern(`products:${userId}:*`);

    const result = await ProductModel.findWithImages(productId);

    // Sync to Sheets + Supabase Realtime
    SyncBridge.emit('product:updated', { product: result, userId }).catch(() => {});

    return result;
  }

  /**
   * Bulk update status (mark as not for sale, archive, etc.)
   */
  async bulkUpdateStatus(userId, productIds, status) {
    // Verify ownership
    const products = await db('products')
      .whereIn('id', productIds)
      .where({ user_id: userId });

    if (products.length !== productIds.length) {
      throw new AuthorizationError('Some products do not belong to you');
    }

    await db('products')
      .whereIn('id', productIds)
      .update({ status, updated_at: db.fn.now() });

    // If marking as not_for_sale or archived, delist from all marketplaces
    if (['not_for_sale', 'archived', 'deleted'].includes(status)) {
      await db('listings')
        .whereIn('product_id', productIds)
        .where({ status: 'active' })
        .update({ status: 'delisted', updated_at: db.fn.now() });
    }

    await this._logActivity(userId, 'product', null, 'bulk_status_update', {
      productIds,
      newStatus: status,
    });

    await redis.cacheInvalidatePattern(`products:${userId}:*`);

    return { updated: products.length, status };
  }

  /**
   * Delete product (soft delete)
   */
  async delete(userId, productId) {
    const product = await ProductModel.findByIdOrFail(productId);
    if (product.user_id !== userId) {
      throw new AuthorizationError('Not your product');
    }

    await ProductModel.softDelete(productId);
    await ListingModel.delistAllForProduct(productId);

    await this._logActivity(userId, 'product', productId, 'deleted');
    await redis.cacheInvalidatePattern(`products:${userId}:*`);
  }

  /**
   * Get product statistics
   */
  async getStats(userId) {
    return ProductModel.getStats(userId);
  }

  // --- Private helpers ---

  _generateSku() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let sku = 'RP-';
    for (let i = 0; i < 8; i++) {
      sku += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return sku;
  }

  async _logActivity(userId, entityType, entityId, action, details = {}) {
    try {
      await db('activity_log').insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        action,
        details: JSON.stringify(details),
      });
    } catch (err) {
      logger.error('Failed to log activity:', err.message);
    }
  }
}

module.exports = new ProductService();
