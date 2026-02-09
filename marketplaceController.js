// src/controllers/marketplaceController.js
const Joi = require('joi');
const db = require('../config/database');
const MarketplaceConnection = require('../models/MarketplaceConnection');
const { success, created } = require('../utils/response');

const connectSchema = {
  body: Joi.object({
    marketplaceId: Joi.string().required(),
    authCode: Joi.string().optional(),      // For OAuth-based (eBay)
    credentials: Joi.object({               // For automation-based (Poshmark, Mercari)
      email: Joi.string().email(),
      password: Joi.string(),
    }).optional(),
  }),
};

const getMarketplaces = async (req, res) => {
  const marketplaces = await db('marketplaces').where({ active: true }).orderBy('name');
  return success(res, marketplaces);
};

const getConnections = async (req, res) => {
  const connections = await MarketplaceConnection.findByUser(req.user.id);
  // Strip sensitive data
  const sanitized = connections.map(c => ({
    ...c,
    access_token_encrypted: undefined,
    refresh_token_encrypted: undefined,
    session_data_encrypted: undefined,
  }));
  return success(res, sanitized);
};

const connectMarketplace = async (req, res) => {
  const { marketplaceId, authCode, credentials } = req.body;

  // Check if already connected
  const existing = await MarketplaceConnection.findUserConnection(req.user.id, marketplaceId);

  // Get marketplace adapter
  let adapter;
  try {
    adapter = require(`../services/marketplace/${marketplaceId}Adapter`);
  } catch {
    adapter = require('../services/marketplace/BaseMarketplaceAdapter');
  }

  let connectionData;
  if (authCode) {
    // OAuth flow (eBay)
    connectionData = await adapter.connect(authCode);
  } else if (credentials) {
    // Automation flow (Poshmark, Mercari)
    connectionData = await adapter.connect(credentials);
  }

  const record = {
    user_id: req.user.id,
    marketplace_id: marketplaceId,
    status: 'connected',
    marketplace_username: connectionData.marketplaceUsername,
    access_token_encrypted: connectionData.accessToken,
    refresh_token_encrypted: connectionData.refreshToken,
    session_data_encrypted: connectionData.sessionData,
    token_expires_at: connectionData.expiresIn
      ? new Date(Date.now() + connectionData.expiresIn * 1000)
      : null,
  };

  let connection;
  if (existing) {
    connection = await MarketplaceConnection.update(existing.id, record);
  } else {
    connection = await MarketplaceConnection.create(record);
  }

  return created(res, {
    id: connection.id,
    marketplaceId,
    status: 'connected',
    username: connectionData.marketplaceUsername,
  }, 'Marketplace connected');
};

const disconnectMarketplace = async (req, res) => {
  const connection = await MarketplaceConnection.findUserConnection(req.user.id, req.params.marketplaceId);
  if (connection) {
    await MarketplaceConnection.update(connection.id, {
      status: 'disconnected',
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      session_data_encrypted: null,
    });
  }
  return success(res, null, 'Marketplace disconnected');
};

const getOAuthUrl = async (req, res) => {
  const { marketplaceId } = req.params;
  if (marketplaceId === 'ebay') {
    const ebayAdapter = require('../services/marketplace/ebayAdapter');
    const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64');
    const url = ebayAdapter.getAuthUrl(state);
    return success(res, { authUrl: url });
  }
  return success(res, { authUrl: null, message: 'This marketplace uses credential-based auth' });
};

module.exports = {
  getMarketplaces,
  getConnections,
  connectMarketplace,
  disconnectMarketplace,
  getOAuthUrl,
  schemas: { connectSchema },
};
