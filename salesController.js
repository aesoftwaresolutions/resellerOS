// src/controllers/salesController.js
const Joi = require('joi');
const SaleModel = require('../models/Sale');
const InventorySyncService = require('../services/inventory/InventorySyncService');
const { success, paginated } = require('../utils/response');

const listSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
    status: Joi.string().optional(),
    marketplaceId: Joi.string().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
  }),
};

const recordSaleSchema = {
  body: Joi.object({
    productId: Joi.string().uuid().required(),
    listingId: Joi.string().uuid().optional(),
    marketplaceId: Joi.string().required(),
    salePrice: Joi.number().min(0).required(),
    externalOrderId: Joi.string().optional(),
    buyerInfo: Joi.object().optional(),
  }),
};

const listSales = async (req, res) => {
  const result = await SaleModel.findByUser(req.user.id, req.query);
  return paginated(res, result);
};

const getSale = async (req, res) => {
  const sale = await SaleModel.findByIdOrFail(req.params.id);
  return success(res, sale);
};

const recordSale = async (req, res) => {
  const result = await InventorySyncService.handleSaleEvent(req.user.id, req.body);
  return success(res, result, 'Sale recorded and inventory synced');
};

const getSummary = async (req, res) => {
  const summary = await SaleModel.getSummary(req.user.id, {
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  return success(res, summary);
};

module.exports = {
  listSales,
  getSale,
  recordSale,
  getSummary,
  schemas: { listSchema, recordSaleSchema },
};
