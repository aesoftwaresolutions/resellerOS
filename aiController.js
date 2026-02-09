// src/controllers/aiController.js
const PricingAIService = require('../services/ai/PricingAIService');
const ProductModel = require('../models/Product');
const { success } = require('../utils/response');
const { AuthorizationError } = require('../utils/errors');

const getSuggestedPrice = async (req, res) => {
  const product = await ProductModel.findByIdOrFail(req.params.productId);
  if (product.user_id !== req.user.id) throw new AuthorizationError();

  const suggestion = await PricingAIService.getSuggestedPrice(product);

  // Save suggestion to product record
  await ProductModel.update(product.id, {
    ai_suggested_price: suggestion.suggestedPrice,
    ai_metadata: JSON.stringify({
      ...JSON.parse(product.ai_metadata || '{}'),
      lastPriceSuggestion: suggestion,
    }),
  });

  return success(res, suggestion);
};

const getDemandForecast = async (req, res) => {
  const product = await ProductModel.findByIdOrFail(req.params.productId);
  if (product.user_id !== req.user.id) throw new AuthorizationError();

  const forecast = await PricingAIService.getDemandForecast(product);
  return success(res, forecast);
};

const applySmartMarkdowns = async (req, res) => {
  const result = await PricingAIService.applySmartMarkdowns(req.user.id);
  return success(res, result, 'Smart markdowns applied');
};

module.exports = { getSuggestedPrice, getDemandForecast, applySmartMarkdowns };
