// src/controllers/productController.js
const Joi = require('joi');
const ProductService = require('../services/ProductService');
const { success, created, paginated } = require('../utils/response');

const createSchema = {
  body: Joi.object({
    title: Joi.string().max(500).required(),
    description: Joi.string().allow('').optional(),
    brand: Joi.string().max(255).optional(),
    category: Joi.string().max(255).optional(),
    subcategory: Joi.string().max(255).optional(),
    color: Joi.string().max(100).optional(),
    size: Joi.string().max(100).optional(),
    condition: Joi.string().valid('new_with_tags', 'new_without_tags', 'like_new', 'good', 'fair', 'poor').optional(),
    material: Joi.string().max(255).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    costPrice: Joi.number().min(0).optional(),
    basePrice: Joi.number().min(0).optional(),
    floorPrice: Joi.number().min(0).optional(),
    quantity: Joi.number().integer().min(1).optional(),
    sku: Joi.string().max(100).optional(),
    barcode: Joi.string().max(100).optional(),
    location: Joi.string().max(255).optional(),
    sourceType: Joi.string().valid('purchased', 'consignment', 'dropship', 'brand_return', 'thrift', 'wholesale', 'other').optional(),
    sourceName: Joi.string().max(255).optional(),
    sourceCost: Joi.number().min(0).optional(),
    sourceDate: Joi.date().optional(),
    weightOz: Joi.number().min(0).optional(),
    lengthIn: Joi.number().min(0).optional(),
    widthIn: Joi.number().min(0).optional(),
    heightIn: Joi.number().min(0).optional(),
    shippingProfile: Joi.string().max(100).optional(),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().uri().required(),
        thumbnailUrl: Joi.string().uri().optional(),
        s3Key: Joi.string().optional(),
        width: Joi.number().optional(),
        height: Joi.number().optional(),
        fileSize: Joi.number().optional(),
        contentType: Joi.string().optional(),
      })
    ).optional(),
    customFields: Joi.object().optional(),
    status: Joi.string().valid('draft', 'active').optional(),
  }),
};

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
    status: Joi.string().valid('draft', 'active', 'sold', 'not_for_sale', 'archived').optional(),
    category: Joi.string().optional(),
    search: Joi.string().max(255).optional(),
    sortBy: Joi.string().valid('created_at', 'base_price', 'title', 'days_listed', 'total_views').default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

const bulkStatusSchema = {
  body: Joi.object({
    productIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
    status: Joi.string().valid('active', 'not_for_sale', 'archived', 'deleted', 'draft').required(),
  }),
};

const createProduct = async (req, res) => {
  const product = await ProductService.create(req.user.id, req.body);
  return created(res, product, 'Product created');
};

const listProducts = async (req, res) => {
  const result = await ProductService.list(req.user.id, req.query);
  return paginated(res, result);
};

const getProduct = async (req, res) => {
  const product = await ProductService.getById(req.user.id, req.params.id);
  return success(res, product);
};

const updateProduct = async (req, res) => {
  const product = await ProductService.update(req.user.id, req.params.id, req.body);
  return success(res, product, 'Product updated');
};

const deleteProduct = async (req, res) => {
  await ProductService.delete(req.user.id, req.params.id);
  return success(res, null, 'Product deleted');
};

const bulkUpdateStatus = async (req, res) => {
  const result = await ProductService.bulkUpdateStatus(req.user.id, req.body.productIds, req.body.status);
  return success(res, result);
};

const getStats = async (req, res) => {
  const stats = await ProductService.getStats(req.user.id);
  return success(res, stats);
};

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateStatus,
  getStats,
  schemas: { createSchema, listSchema, bulkStatusSchema },
};
