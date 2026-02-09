// src/services/marketplace/ebayAdapter.js
const BaseMarketplaceAdapter = require('./BaseMarketplaceAdapter');
const config = require('../../config');
const logger = require('../../utils/logger');
const axios = require('axios');

class EbayAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super('ebay');
    this.sandbox = config.marketplace.ebay.sandbox;
    this.baseUrl = this.sandbox
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';
    this.authUrl = this.sandbox
      ? 'https://auth.sandbox.ebay.com'
      : 'https://auth.ebay.com';
  }

  /**
   * Generate OAuth authorization URL for user to connect their eBay account
   */
  getAuthUrl(state) {
    const scopes = [
      'https://api.ebay.com/oauth/api_scope',
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.marketing',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
    ];

    return `${this.authUrl}/oauth2/authorize?` +
      `client_id=${config.marketplace.ebay.appId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(config.marketplace.ebay.redirectUri)}` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&state=${state}`;
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  async connect(authCode) {
    const credentials = Buffer.from(
      `${config.marketplace.ebay.appId}:${config.marketplace.ebay.certId}`
    ).toString('base64');

    const response = await axios.post(
      `${this.baseUrl}/identity/v1/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: config.marketplace.ebay.redirectUri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  }

  /**
   * Refresh the access token
   */
  async refreshAuth(connection) {
    const credentials = Buffer.from(
      `${config.marketplace.ebay.appId}:${config.marketplace.ebay.certId}`
    ).toString('base64');

    const response = await axios.post(
      `${this.baseUrl}/identity/v1/oauth2/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token_encrypted, // decrypt in production
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in,
    };
  }

  /**
   * Create a listing using eBay Inventory API
   */
  async createListing(connection, listingData) {
    const sku = listingData.sku || `RP-${Date.now()}`;

    // 1. Create/update inventory item
    await this._apiRequest(connection, 'PUT',
      `${this.baseUrl}/sell/inventory/v1/inventory_item/${sku}`,
      {
        product: {
          title: listingData.title,
          description: listingData.description,
          aspects: {
            Brand: [listingData.brand || 'Unbranded'],
            Color: [listingData.color || 'Multicolor'],
            Size: [listingData.size || 'One Size'],
          },
          imageUrls: listingData.images,
        },
        condition: listingData.conditionId ? String(listingData.conditionId) : 'USED_GOOD',
        availability: {
          shipToLocationAvailability: {
            quantity: listingData.quantity || 1,
          },
        },
      }
    );

    // 2. Create offer (the actual listing)
    const offer = await this._apiRequest(connection, 'POST',
      `${this.baseUrl}/sell/inventory/v1/offer`,
      {
        sku,
        marketplaceId: 'EBAY_US',
        format: 'FIXED_PRICE',
        listingDuration: 'GTC',
        pricingSummary: {
          price: {
            value: String(listingData.price),
            currency: 'USD',
          },
        },
        categoryId: listingData.categoryId || '11450', // default: Clothing
        merchantLocationKey: listingData.locationKey,
      }
    );

    // 3. Publish the offer
    const published = await this._apiRequest(connection, 'POST',
      `${this.baseUrl}/sell/inventory/v1/offer/${offer.offerId}/publish`
    );

    return {
      externalListingId: published.listingId,
      externalUrl: `https://www.ebay.com/itm/${published.listingId}`,
      offerId: offer.offerId,
    };
  }

  /**
   * Update listing
   */
  async updateListing(connection, externalListingId, updateData) {
    // eBay updates go through the offer/inventory API
    if (updateData.price) {
      // Need to find the offerId for this listing
      // Then update offer with new price
      logger.info(`eBay price update for ${externalListingId}: $${updateData.price}`);
    }
  }

  /**
   * End/delete a listing
   */
  async deleteListing(connection, externalListingId) {
    await this._apiRequest(connection, 'POST',
      `${this.baseUrl}/sell/inventory/v1/offer/${externalListingId}/withdraw`
    );
  }

  /**
   * Get active listings
   */
  async getActiveListings(connection) {
    const response = await this._apiRequest(connection, 'GET',
      `${this.baseUrl}/sell/inventory/v1/offer?limit=200&offset=0`
    );

    return (response.offers || []).map(offer => ({
      id: offer.listing?.listingId || offer.offerId,
      title: offer.listing?.title,
      price: parseFloat(offer.pricingSummary?.price?.value || 0),
      status: offer.listing?.listingStatus === 'ACTIVE' ? 'active' : 'inactive',
      views: 0,
      likes: 0,
      rawData: offer,
    }));
  }

  /**
   * Get recent sales
   */
  async getRecentSales(connection, since) {
    const filter = since
      ? `creationdate:[${since}..${new Date().toISOString()}]`
      : `creationdate:[${new Date(Date.now() - 7 * 86400000).toISOString()}..${new Date().toISOString()}]`;

    const response = await this._apiRequest(connection, 'GET',
      `${this.baseUrl}/sell/fulfillment/v1/order?filter=${encodeURIComponent(filter)}&limit=50`
    );

    return (response.orders || []).map(order => ({
      orderId: order.orderId,
      listingId: order.lineItems?.[0]?.legacyItemId,
      soldPrice: parseFloat(order.pricingSummary?.total?.value || 0),
      buyer: { username: order.buyer?.username },
      soldAt: order.creationDate,
      status: order.orderFulfillmentStatus,
    }));
  }

  _getAuthHeaders(connection) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${connection.access_token_encrypted}`, // decrypt in production
    };
  }
}

module.exports = new EbayAdapter();
