// src/controllers/listingController.js
const Joi = require('joi');
const CrossListService = require('../services/inventory/CrossListService');
const InventorySyncService = require('../services/inventory/InventorySyncService');
const ListingModel = require('../models/Listing');
const { success, created, paginated } = require('../utils/response');

const crossListSchema = {
  body: Joi.object({
    productId: Joi.string().uuid().required(),
    marketplaceIds: Joi.array().items(Joi.string()).min(1).required(),
    prices: Joi.object().pattern(Joi.string(), Joi.number().min(0)).optional(),
    autoDelistOnSale: Joi.boolean().default(true),
    autoRelist: Joi.boolean().default(false),
    relistIntervalDays: Joi.number().integer().min(1).optional(),
    autoShare: Joi.boolean().default(false),
    shareIntervalHours: Joi.number().integer().min(1).optional(),
    autoOffer: Joi.boolean().default(false),
    autoOfferDiscountPct: Joi.number().min(1).max(50).optional(),
  }),
};

const bulkCrossListSchema = {
  body: Joi.object({
    productIds: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
    marketplaceIds: Joi.array().items(Joi.string()).min(1).required(),
    options: Joi.object().optional(),
  }),
};

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
    status: Joi.string().optional(),
    marketplaceId: Joi.string().optional(),
    sortBy: Joi.string().default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

const crossList = async (req, res) => {
  const { productId, marketplaceIds, ...options } = req.body;
  const result = await CrossListService.crossList(req.user.id, productId, marketplaceIds, options);
  return created(res, result, 'Cross-listing initiated');
};

const bulkCrossList = async (req, res) => {
  const { productIds, marketplaceIds, options } = req.body;
  const result = await CrossListService.bulkCrossList(req.user.id, productIds, marketplaceIds, options);
  return created(res, result, 'Bulk cross-listing initiated');
};

const listListings = async (req, res) => {
  const result = await ListingModel.findByUser(req.user.id, req.query);
  return paginated(res, result);
};

const getListing = async (req, res) => {
  const listing = await ListingModel.findByIdOrFail(req.params.id);
  return success(res, listing);
};

const relistListing = async (req, res) => {
  const result = await CrossListService.relist(req.user.id, req.params.id);
  return success(res, result);
};

const delistListing = async (req, res) => {
  const result = await CrossListService.delist(req.user.id, req.params.id);
  return success(res, result);
};

const getMarketplaceStats = async (req, res) => {
  const stats = await ListingModel.getMarketplaceStats(req.user.id);
  return success(res, stats);
};

const syncMarketplace = async (req, res) => {
  const result = await InventorySyncService.fullSync(req.user.id, req.params.connectionId);
  return success(res, result, 'Sync completed');
};

module.exports = {
  crossList,
  bulkCrossList,
  listListings,
  getListing,
  relistListing,
  delistListing,
  getMarketplaceStats,
  syncMarketplace,
  schemas: { crossListSchema, bulkCrossListSchema, listSchema },
};
