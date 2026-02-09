// src/controllers/sheetsSyncController.js
const GoogleSheetsSync = require('../services/sync/GoogleSheetsSync');
const { success } = require('../utils/response');

// Full push sync — overwrites Sheet with current DB state
const fullSync = async (req, res) => {
  const userId = req.user.id;
  const [products, listings, sales] = await Promise.all([
    GoogleSheetsSync.fullSyncProducts(userId),
    GoogleSheetsSync.fullSyncListings(userId),
    GoogleSheetsSync.fullSyncSales(userId),
  ]);
  return success(res, { products, listings, sales }, 'Full sync to Google Sheets complete');
};

// Pull Sheet edits back into DB
const pullChanges = async (req, res) => {
  const result = await GoogleSheetsSync.pullProductChanges(req.user.id);
  return success(res, result, `Pulled ${result.updated} changes from Sheet`);
};

// Sync single table
const syncProducts = async (req, res) => {
  const result = await GoogleSheetsSync.fullSyncProducts(req.user.id);
  return success(res, result);
};

const syncListings = async (req, res) => {
  const result = await GoogleSheetsSync.fullSyncListings(req.user.id);
  return success(res, result);
};

const syncSales = async (req, res) => {
  const result = await GoogleSheetsSync.fullSyncSales(req.user.id);
  return success(res, result);
};

// Status check
const status = async (req, res) => {
  const config = require('../config');
  return success(res, {
    sheetsEnabled: config.googleSheets.enabled,
    supabaseEnabled: config.supabase.enabled,
    spreadsheetId: config.googleSheets.spreadsheetId ? '***' + config.googleSheets.spreadsheetId.slice(-6) : null,
    pullInterval: config.googleSheets.pullIntervalMinutes + ' min',
  });
};

module.exports = { fullSync, pullChanges, syncProducts, syncListings, syncSales, status };
