// src/services/ai/PricingAIService.js
const config = require('../../config');
const db = require('../../config/database');
const redis = require('../../config/redis');
const logger = require('../../utils/logger');

class PricingAIService {
  constructor() {
    this.model = config.ai.openaiModel;
  }

  /**
   * Get AI-powered pricing suggestion for a product
   */
  async getSuggestedPrice(product, options = {}) {
    const cacheKey = `ai:price:${product.id}`;
    const cached = await redis.cacheGet(cacheKey);
    if (cached) return cached;

    try {
      // 1. Get comparable sold items from our database
      const comparables = await this._findComparables(product);

      // 2. Get marketplace-specific data
      const marketData = await this._getMarketData(product);

      // 3. Calculate statistical price range
      const stats = this._calculatePriceStats(comparables);

      // 4. Use AI for nuanced pricing
      const aiSuggestion = await this._getAIPriceSuggestion(product, comparables, marketData, stats);

      const result = {
        suggestedPrice: aiSuggestion.price,
        priceRange: {
          low: stats.p25,
          median: stats.median,
          high: stats.p75,
        },
        confidence: aiSuggestion.confidence,
        reasoning: aiSuggestion.reasoning,
        comparablesCount: comparables.length,
        demandScore: aiSuggestion.demandScore,
        sellThroughRate: stats.sellThroughRate,
        avgDaysToSell: stats.avgDaysToSell,
        marketplaceBreakdown: aiSuggestion.marketplaceBreakdown || {},
        updatedAt: new Date().toISOString(),
      };

      await redis.cacheSet(cacheKey, result, 3600); // Cache 1 hour
      return result;
    } catch (err) {
      logger.error('AI pricing failed:', err.message);
      // Fallback to statistical pricing
      return this._fallbackPricing(product);
    }
  }

  /**
   * Get demand forecast for a product
   */
  async getDemandForecast(product) {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: config.ai.openaiApiKey });

      const prompt = `Analyze demand for this resale item and provide a forecast:
        Title: ${product.title}
        Brand: ${product.brand || 'Unknown'}
        Category: ${product.category || 'General'}
        Condition: ${product.condition || 'Good'}
        Current Price: $${product.base_price || 'Not set'}
        Days Listed: ${product.days_listed || 0}

        Provide a JSON response with:
        - demandScore (1-100, where 100 is highest demand)
        - trendDirection ("rising", "stable", "declining")
        - seasonalFactor (multiplier, 1.0 = neutral)
        - bestTimeToSell (month or season)
        - priceElasticity ("high", "medium", "low")
        - recommendation (brief strategy)`;

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a resale market analyst. Respond only with valid JSON. No markdown.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content.replace(/```json\n?|```/g, '').trim());
    } catch (err) {
      logger.error('Demand forecast failed:', err.message);
      return {
        demandScore: 50,
        trendDirection: 'stable',
        seasonalFactor: 1.0,
        recommendation: 'Unable to generate forecast. Consider competitive pricing.',
      };
    }
  }

  /**
   * Apply smart markdown rules automatically
   */
  async applySmartMarkdowns(userId) {
    // Get all active pricing rules for the user
    const rules = await db('pricing_rules')
      .where({ user_id: userId, active: true });

    let applied = 0;

    for (const rule of rules) {
      const listings = await this._getMatchingListings(userId, rule);

      for (const listing of listings) {
        const shouldApply = await this._evaluateRule(rule, listing);
        if (!shouldApply) continue;

        const newPrice = this._calculateNewPrice(rule, listing);
        if (newPrice && newPrice !== listing.listed_price) {
          // Check floor price
          const product = await db('products').where({ id: listing.product_id }).first();
          const floorPrice = rule.price_floor || product?.floor_price || 0;

          if (newPrice >= floorPrice) {
            await db('listings').where({ id: listing.id }).update({
              listed_price: newPrice,
              updated_at: db.fn.now(),
            });

            // Queue price sync to marketplace
            await db('automation_tasks').insert({
              user_id: userId,
              type: 'price_update',
              marketplace_id: listing.marketplace_id,
              listing_id: listing.id,
              product_id: listing.product_id,
              status: 'queued',
              payload: JSON.stringify({
                oldPrice: listing.listed_price,
                newPrice,
                ruleId: rule.id,
                ruleName: rule.name,
              }),
            });

            applied++;

            await db('activity_log').insert({
              user_id: userId,
              entity_type: 'listing',
              entity_id: listing.id,
              action: 'price_markdown',
              marketplace_id: listing.marketplace_id,
              details: JSON.stringify({
                oldPrice: listing.listed_price,
                newPrice,
                rule: rule.name,
              }),
            });
          }
        }
      }

      // Update rule application count
      await db('pricing_rules').where({ id: rule.id }).update({
        times_applied: db.raw('times_applied + ?', [applied]),
        updated_at: db.fn.now(),
      });
    }

    return { rulesEvaluated: rules.length, pricesUpdated: applied };
  }

  // --- Private Methods ---

  async _findComparables(product) {
    // Find similar sold items in our database
    const results = await db('sales')
      .join('products', 'sales.product_id', 'products.id')
      .where(function () {
        if (product.brand) this.where('products.brand', 'ilike', product.brand);
        if (product.category) this.orWhere('products.category', product.category);
      })
      .where('sales.status', 'completed')
      .where('sales.sold_at', '>=', db.raw("NOW() - INTERVAL '90 days'"))
      .select('sales.sale_price', 'sales.sold_at', 'products.condition', 'products.brand', 'sales.marketplace_id')
      .orderBy('sales.sold_at', 'desc')
      .limit(50);

    return results;
  }

  async _getMarketData(product) {
    // Placeholder for external market data (eBay completed listings, etc.)
    return {
      avgMarketPrice: product.base_price || 0,
      lowestActive: 0,
      highestSold: 0,
    };
  }

  _calculatePriceStats(comparables) {
    if (comparables.length === 0) {
      return { median: 0, p25: 0, p75: 0, sellThroughRate: 0, avgDaysToSell: 0 };
    }

    const prices = comparables.map(c => parseFloat(c.sale_price)).sort((a, b) => a - b);
    const len = prices.length;

    return {
      median: prices[Math.floor(len / 2)],
      p25: prices[Math.floor(len * 0.25)],
      p75: prices[Math.floor(len * 0.75)],
      mean: prices.reduce((a, b) => a + b, 0) / len,
      min: prices[0],
      max: prices[len - 1],
      count: len,
      sellThroughRate: 0.65, // placeholder
      avgDaysToSell: 14, // placeholder
    };
  }

  async _getAIPriceSuggestion(product, comparables, marketData, stats) {
    if (!config.ai.openaiApiKey) {
      return {
        price: stats.median || product.base_price || 25,
        confidence: 'low',
        reasoning: 'AI pricing not configured. Using statistical median.',
        demandScore: 50,
      };
    }

    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: config.ai.openaiApiKey });

      const prompt = `Price this resale item optimally:
        Item: ${product.title}
        Brand: ${product.brand || 'Unknown'}
        Category: ${product.category || 'General'}
        Condition: ${product.condition || 'good'}
        Cost: $${product.cost_price || 'Unknown'}
        
        Comparable sales (last 90 days): ${comparables.length} items
        Price range: $${stats.min || 0} - $${stats.max || 0}
        Median sold price: $${stats.median || 0}
        
        Respond with JSON only:
        { "price": number, "confidence": "high"|"medium"|"low", "reasoning": "string", "demandScore": 1-100 }`;

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert resale pricing analyst. Respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content.replace(/```json\n?|```/g, '').trim());
    } catch (err) {
      logger.error('OpenAI pricing call failed:', err.message);
      return {
        price: stats.median || product.base_price || 25,
        confidence: 'low',
        reasoning: 'AI unavailable. Using statistical pricing.',
        demandScore: 50,
      };
    }
  }

  _fallbackPricing(product) {
    const basePrice = product.base_price || product.cost_price || 25;
    return {
      suggestedPrice: basePrice,
      priceRange: { low: basePrice * 0.8, median: basePrice, high: basePrice * 1.3 },
      confidence: 'low',
      reasoning: 'Fallback pricing based on listed price',
      comparablesCount: 0,
      demandScore: 50,
    };
  }

  async _getMatchingListings(userId, rule) {
    let query = db('listings')
      .join('products', 'listings.product_id', 'products.id')
      .where({ 'listings.user_id': userId, 'listings.status': 'active' })
      .select('listings.*', 'products.floor_price', 'products.days_listed', 'products.total_likes');

    if (rule.scope === 'marketplace' && rule.scope_filter?.marketplace_id) {
      query = query.where('listings.marketplace_id', rule.scope_filter.marketplace_id);
    }
    if (rule.scope === 'category' && rule.scope_filter?.category) {
      query = query.where('products.category', rule.scope_filter.category);
    }

    return query;
  }

  async _evaluateRule(rule, listing) {
    const conditions = rule.trigger_conditions || {};

    switch (rule.trigger_type) {
      case 'days_listed': {
        const daysListed = listing.days_listed || 0;
        return daysListed >= (conditions.days || 30);
      }
      case 'no_likes': {
        const daysListed = listing.days_listed || 0;
        return daysListed >= (conditions.days || 7) && (listing.total_likes || 0) === 0;
      }
      case 'scheduled': {
        return new Date() >= new Date(conditions.date);
      }
      default:
        return false;
    }
  }

  _calculateNewPrice(rule, listing) {
    const currentPrice = parseFloat(listing.listed_price);

    switch (rule.action_type) {
      case 'percentage_off':
        return Math.round(currentPrice * (1 - rule.action_value / 100) * 100) / 100;
      case 'fixed_reduction':
        return Math.round((currentPrice - rule.action_value) * 100) / 100;
      case 'set_price':
        return rule.action_value;
      default:
        return null;
    }
  }
}

module.exports = new PricingAIService();
