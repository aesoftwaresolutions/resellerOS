// src/services/marketplace/BaseMarketplaceAdapter.js
const logger = require('../../utils/logger');
const { MarketplaceError } = require('../../utils/errors');

/**
 * Base class for all marketplace integrations.
 * Each marketplace (eBay, Poshmark, Mercari, etc.) extends this.
 */
class BaseMarketplaceAdapter {
  constructor(marketplaceId) {
    this.marketplaceId = marketplaceId;
  }

  /**
   * Connect/authenticate to the marketplace
   * @param {Object} connection - marketplace_connections row
   * @returns {Object} Updated connection data
   */
  async connect(connection) {
    throw new MarketplaceError(this.marketplaceId, 'connect() not implemented');
  }

  /**
   * Refresh authentication tokens
   */
  async refreshAuth(connection) {
    throw new MarketplaceError(this.marketplaceId, 'refreshAuth() not implemented');
  }

  /**
   * Push a new listing to the marketplace
   * @param {Object} connection - marketplace_connections row
   * @param {Object} listingData - transformed listing data
   * @returns {Object} { externalListingId, externalUrl }
   */
  async createListing(connection, listingData) {
    throw new MarketplaceError(this.marketplaceId, 'createListing() not implemented');
  }

  /**
   * Update an existing listing on the marketplace
   */
  async updateListing(connection, externalListingId, updateData) {
    throw new MarketplaceError(this.marketplaceId, 'updateListing() not implemented');
  }

  /**
   * Update just the price of a listing
   */
  async updatePrice(connection, externalListingId, newPrice) {
    return this.updateListing(connection, externalListingId, { price: newPrice });
  }

  /**
   * Remove a listing from the marketplace
   */
  async deleteListing(connection, externalListingId) {
    throw new MarketplaceError(this.marketplaceId, 'deleteListing() not implemented');
  }

  /**
   * Get all active listings from the marketplace
   * @returns {Array<Object>} Array of external listing objects
   */
  async getActiveListings(connection) {
    throw new MarketplaceError(this.marketplaceId, 'getActiveListings() not implemented');
  }

  /**
   * Get recent sales/orders from the marketplace
   */
  async getRecentSales(connection, since) {
    throw new MarketplaceError(this.marketplaceId, 'getRecentSales() not implemented');
  }

  /**
   * Share/bump a listing for visibility
   */
  async shareListing(connection, externalListingId) {
    throw new MarketplaceError(this.marketplaceId, 'shareListing() not implemented');
  }

  /**
   * Send an offer to likers/watchers
   */
  async sendOffer(connection, externalListingId, offerPrice, message) {
    throw new MarketplaceError(this.marketplaceId, 'sendOffer() not implemented');
  }

  /**
   * Get marketplace-specific categories
   */
  async getCategories() {
    return [];
  }

  /**
   * Validate listing data before push
   */
  validateListingData(data) {
    const errors = [];
    if (!data.title) errors.push('Title is required');
    if (!data.price || data.price <= 0) errors.push('Valid price is required');
    if (!data.images || data.images.length === 0) errors.push('At least one image is required');
    return errors;
  }

  /**
   * Helper: make authenticated API request with retry
   */
  async _apiRequest(connection, method, url, data = null, retries = 2) {
    const axios = require('axios');

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axios({
          method,
          url,
          data,
          headers: this._getAuthHeaders(connection),
          timeout: 30000,
        });
        return response.data;
      } catch (err) {
        if (attempt === retries) {
          throw new MarketplaceError(
            this.marketplaceId,
            `API request failed: ${err.message}`,
            err
          );
        }

        // If auth expired, try to refresh
        if (err.response?.status === 401 && attempt === 0) {
          try {
            await this.refreshAuth(connection);
          } catch (refreshErr) {
            throw new MarketplaceError(
              this.marketplaceId,
              'Authentication expired and refresh failed',
              refreshErr
            );
          }
        }

        // Exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        logger.warn(`Retrying ${this.marketplaceId} API request (attempt ${attempt + 1})`);
      }
    }
  }

  _getAuthHeaders(connection) {
    return {
      'Content-Type': 'application/json',
    };
  }
}

module.exports = BaseMarketplaceAdapter;
