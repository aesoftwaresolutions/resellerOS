// src/services/sync/GoogleSheetsSync.js
// ═══════════════════════════════════════════════════════
//  Google Sheets Two-Way Sync
//
//  Sheet becomes a live, editable view of your inventory.
//  Changes flow both directions:
//    DB change → Sheet updated (via push after DB write)
//    Sheet edit → DB updated (via periodic pull / webhook)
//
//  Setup:
//    1. Create a Google Cloud project
//    2. Enable Google Sheets API
//    3. Create a Service Account, download JSON key
//    4. Share your spreadsheet with the service account email
//    5. Set GOOGLE_SHEETS_* env vars
// ═══════════════════════════════════════════════════════

const { google } = require('googleapis');
const db = require('../../config/database');
const logger = require('../../utils/logger');
const config = require('../../config');

// ─── Auth ───
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: config.googleSheets.clientEmail,
      private_key: config.googleSheets.privateKey?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

const SPREADSHEET_ID = config.googleSheets.spreadsheetId;

// ─── Sheet tab names ───
const TABS = {
  PRODUCTS: 'Products',
  LISTINGS: 'Listings',
  SALES: 'Sales',
  INVENTORY: 'Inventory Overview',
};

// ─── Column mappings ───
const PRODUCT_HEADERS = [
  'ID', 'SKU', 'Title', 'Brand', 'Category', 'Size', 'Color', 'Condition',
  'Cost Price', 'Selling Price', 'Floor Price', 'Status', 'Quantity',
  'Days Listed', 'Source', 'Tags', 'AI Suggested', 'Created', 'Updated',
];

const LISTING_HEADERS = [
  'ID', 'Product SKU', 'Product Title', 'Marketplace', 'Status',
  'Listed Price', 'Est. Payout', 'External URL', 'Listed At', 'Last Synced',
];

const SALES_HEADERS = [
  'ID', 'Product Title', 'Marketplace', 'Sale Price', 'Marketplace Fee',
  'Shipping Cost', 'Profit', 'Status', 'Buyer', 'Sold At',
];

class GoogleSheetsSync {
  constructor() {
    this.sheets = null;
    this.lastSyncedAt = {};
  }

  /**
   * Initialize the sync service — create tabs and headers if they don't exist
   */
  async initialize() {
    if (!SPREADSHEET_ID || !config.googleSheets.clientEmail) {
      logger.warn('Google Sheets sync not configured — skipping');
      return false;
    }

    this.sheets = getSheets();

    try {
      // Get existing sheet tabs
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });
      const existingTabs = spreadsheet.data.sheets.map(s => s.properties.title);

      // Create missing tabs
      const tabsToCreate = Object.values(TABS).filter(t => !existingTabs.includes(t));
      if (tabsToCreate.length > 0) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: tabsToCreate.map(title => ({
              addSheet: { properties: { title } },
            })),
          },
        });
      }

      // Write headers to each tab
      await this._writeHeaders(TABS.PRODUCTS, PRODUCT_HEADERS);
      await this._writeHeaders(TABS.LISTINGS, LISTING_HEADERS);
      await this._writeHeaders(TABS.SALES, SALES_HEADERS);

      // Format header rows (bold, freeze, color)
      await this._formatHeaders();

      logger.info('✅ Google Sheets sync initialized');
      return true;
    } catch (err) {
      logger.error('Google Sheets init failed:', err.message);
      return false;
    }
  }

  // ═══════════════════════════════════════
  //  PUSH: DB → Google Sheet
  // ═══════════════════════════════════════

  /**
   * Full sync — push all products for a user to the sheet.
   * Call this on first setup or to reset.
   */
  async fullSyncProducts(userId) {
    const products = await db('products')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    const rows = products.map(p => this._productToRow(p));
    await this._clearAndWrite(TABS.PRODUCTS, PRODUCT_HEADERS, rows);

    logger.info(`Sheets: Full sync ${products.length} products`);
    return { synced: products.length };
  }

  /**
   * Full sync — push all listings for a user
   */
  async fullSyncListings(userId) {
    const listings = await db('listings')
      .where({ 'listings.user_id': userId })
      .join('products', 'listings.product_id', 'products.id')
      .select(
        'listings.*',
        'products.sku as product_sku',
        'products.title as product_title'
      )
      .orderBy('listings.created_at', 'desc');

    const rows = listings.map(l => this._listingToRow(l));
    await this._clearAndWrite(TABS.LISTINGS, LISTING_HEADERS, rows);

    logger.info(`Sheets: Full sync ${listings.length} listings`);
    return { synced: listings.length };
  }

  /**
   * Full sync — push all sales for a user
   */
  async fullSyncSales(userId) {
    const salesData = await db('sales')
      .where({ user_id: userId })
      .orderBy('sold_at', 'desc');

    const rows = salesData.map(s => this._saleToRow(s));
    await this._clearAndWrite(TABS.SALES, SALES_HEADERS, rows);

    logger.info(`Sheets: Full sync ${salesData.length} sales`);
    return { synced: salesData.length };
  }

  /**
   * Incremental push — update a single product row in the sheet.
   * Call this after any product create/update/delete.
   */
  async pushProductUpdate(product) {
    try {
      const row = this._productToRow(product);
      await this._upsertRow(TABS.PRODUCTS, 0, product.id, row);
      logger.debug(`Sheets: Pushed product ${product.id}`);
    } catch (err) {
      logger.warn(`Sheets push failed for product ${product.id}: ${err.message}`);
    }
  }

  /**
   * Incremental push — update a single listing row
   */
  async pushListingUpdate(listing) {
    try {
      const row = this._listingToRow(listing);
      await this._upsertRow(TABS.LISTINGS, 0, listing.id, row);
    } catch (err) {
      logger.warn(`Sheets push failed for listing ${listing.id}: ${err.message}`);
    }
  }

  /**
   * Incremental push — add a sale row
   */
  async pushSaleCreated(sale) {
    try {
      const row = this._saleToRow(sale);
      await this._appendRow(TABS.SALES, row);
    } catch (err) {
      logger.warn(`Sheets push failed for sale ${sale.id}: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════
  //  PULL: Google Sheet → DB
  //  (for edits made directly in the Sheet)
  // ═══════════════════════════════════════

  /**
   * Pull product changes from Sheet back to DB.
   * Compares Sheet rows with DB and applies edits.
   * Only updates fields the user is likely to edit in a Sheet:
   *   title, brand, price, floor_price, status, tags
   */
  async pullProductChanges(userId) {
    const sheetData = await this._readAllRows(TABS.PRODUCTS);
    if (!sheetData || sheetData.length === 0) return { updated: 0 };

    let updated = 0;

    for (const row of sheetData) {
      const productId = row[0]; // Column A = ID
      if (!productId) continue;

      const existing = await db('products')
        .where({ id: productId, user_id: userId })
        .first();
      if (!existing) continue;

      // Map Sheet columns back to DB fields
      const sheetValues = {
        title: row[2] || existing.title,
        brand: row[3] || existing.brand,
        base_price: parseFloat(row[9]) || existing.base_price,
        floor_price: parseFloat(row[10]) || existing.floor_price,
        status: (row[11] || existing.status).toLowerCase(),
        tags: row[15] ? row[15].split(',').map(t => t.trim()) : existing.tags,
      };

      // Check if anything changed
      const hasChanges =
        sheetValues.title !== existing.title ||
        sheetValues.brand !== existing.brand ||
        sheetValues.base_price !== parseFloat(existing.base_price) ||
        sheetValues.floor_price !== parseFloat(existing.floor_price) ||
        sheetValues.status !== existing.status;

      if (hasChanges) {
        await db('products')
          .where({ id: productId })
          .update({
            ...sheetValues,
            tags: JSON.stringify(sheetValues.tags),
            updated_at: new Date(),
          });
        updated++;
        logger.info(`Sheets pull: Updated product ${productId} from Sheet edits`);
      }
    }

    return { updated };
  }

  // ═══════════════════════════════════════
  //  Row conversion helpers
  // ═══════════════════════════════════════

  _productToRow(p) {
    return [
      p.id,
      p.sku || '',
      p.title || '',
      p.brand || '',
      p.category || '',
      p.size || '',
      p.color || '',
      p.condition || '',
      p.cost_price ? Number(p.cost_price).toFixed(2) : '',
      p.base_price ? Number(p.base_price).toFixed(2) : '',
      p.floor_price ? Number(p.floor_price).toFixed(2) : '',
      p.status || 'draft',
      p.quantity || 1,
      p.days_listed || 0,
      p.source_type || '',
      Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
      p.ai_suggested_price ? Number(p.ai_suggested_price).toFixed(2) : '',
      p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
      p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '',
    ];
  }

  _listingToRow(l) {
    return [
      l.id,
      l.product_sku || '',
      l.product_title || l.title || '',
      l.marketplace_id || '',
      l.status || '',
      l.listed_price ? Number(l.listed_price).toFixed(2) : '',
      l.estimated_payout ? Number(l.estimated_payout).toFixed(2) : '',
      l.external_url || '',
      l.listed_at ? new Date(l.listed_at).toLocaleDateString() : '',
      l.last_synced_at ? new Date(l.last_synced_at).toLocaleString() : '',
    ];
  }

  _saleToRow(s) {
    return [
      s.id,
      s.product_title || '',
      s.marketplace_id || '',
      s.sale_price ? Number(s.sale_price).toFixed(2) : '',
      s.marketplace_fee ? Number(s.marketplace_fee).toFixed(2) : '',
      s.shipping_cost ? Number(s.shipping_cost).toFixed(2) : '',
      s.profit ? Number(s.profit).toFixed(2) : '',
      s.status || '',
      s.buyer_username || '',
      s.sold_at ? new Date(s.sold_at).toLocaleString() : '',
    ];
  }

  // ═══════════════════════════════════════
  //  Low-level Sheet operations
  // ═══════════════════════════════════════

  async _writeHeaders(tab, headers) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tab}'!A1:${this._colLetter(headers.length)}1`,
      valueInputOption: 'RAW',
      resource: { values: [headers] },
    });
  }

  async _clearAndWrite(tab, headers, rows) {
    // Clear everything below headers
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tab}'!A2:ZZ`,
    });

    if (rows.length === 0) return;

    // Write all rows
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tab}'!A2:${this._colLetter(headers.length)}${rows.length + 1}`,
      valueInputOption: 'RAW',
      resource: { values: rows },
    });
  }

  async _appendRow(tab, row) {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tab}'!A:A`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [row] },
    });
  }

  async _upsertRow(tab, idColumnIndex, id, row) {
    // Find the row with matching ID
    const data = await this.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tab}'!A:A`,
    });

    const existingRows = data.data.values || [];
    const rowIndex = existingRows.findIndex(r => r[idColumnIndex] === id);

    if (rowIndex >= 0) {
      // Update existing row
      const range = `'${tab}'!A${rowIndex + 1}:${this._colLetter(row.length)}${rowIndex + 1}`;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: 'RAW',
        resource: { values: [row] },
      });
    } else {
      // Append new row
      await this._appendRow(tab, row);
    }
  }

  async _readAllRows(tab) {
    const result = await this.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${tab}'!A2:ZZ`,
    });
    return result.data.values || [];
  }

  async _formatHeaders() {
    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });
      const sheets = spreadsheet.data.sheets;

      const requests = sheets.map(s => ([
        // Bold header row
        {
          repeatCell: {
            range: { sheetId: s.properties.sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.1, green: 0.12, blue: 0.17 },
                textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 0.85, green: 0.88, blue: 0.92 } },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        // Freeze header row
        {
          updateSheetProperties: {
            properties: { sheetId: s.properties.sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ])).flat();

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: { requests },
      });
    } catch { /* formatting is non-critical */ }
  }

  _colLetter(n) {
    let s = '';
    while (n > 0) {
      n--;
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26);
    }
    return s;
  }
}

module.exports = new GoogleSheetsSync();
