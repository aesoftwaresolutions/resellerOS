// src/routes/index.js
const express = require('express');
const router = express.Router();

const { authenticate, authorize, requirePlan, checkListingLimit } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Controllers
const authCtrl = require('../controllers/authController');
const productCtrl = require('../controllers/productController');
const listingCtrl = require('../controllers/listingController');
const marketplaceCtrl = require('../controllers/marketplaceController');
const aiCtrl = require('../controllers/aiController');
const salesCtrl = require('../controllers/salesController');
const imageCtrl = require('../controllers/imageController');
const sheetsSyncCtrl = require('../controllers/sheetsSyncController');

// ========================
// AUTH ROUTES
// ========================
router.post('/auth/register', validate(authCtrl.schemas.registerSchema), authCtrl.register);
router.post('/auth/login', validate(authCtrl.schemas.loginSchema), authCtrl.login);
router.post('/auth/refresh', validate(authCtrl.schemas.refreshSchema), authCtrl.refreshToken);
router.post('/auth/logout', authenticate, authCtrl.logout);
router.post('/auth/logout-all', authenticate, authCtrl.logoutAll);
router.get('/auth/me', authenticate, authCtrl.me);

// ========================
// PRODUCT ROUTES
// ========================
router.post('/products', authenticate, validate(productCtrl.schemas.createSchema), productCtrl.createProduct);
router.get('/products', authenticate, validate(productCtrl.schemas.listSchema), productCtrl.listProducts);
router.get('/products/stats', authenticate, productCtrl.getStats);
router.get('/products/:id', authenticate, productCtrl.getProduct);
router.patch('/products/:id', authenticate, productCtrl.updateProduct);
router.delete('/products/:id', authenticate, productCtrl.deleteProduct);
router.post('/products/bulk/status', authenticate, validate(productCtrl.schemas.bulkStatusSchema), productCtrl.bulkUpdateStatus);

// ========================
// LISTING / CROSS-LIST ROUTES
// ========================
router.post('/listings/cross-list', authenticate, checkListingLimit, validate(listingCtrl.schemas.crossListSchema), listingCtrl.crossList);
router.post('/listings/bulk-cross-list', authenticate, requirePlan('bulk'), validate(listingCtrl.schemas.bulkCrossListSchema), listingCtrl.bulkCrossList);
router.get('/listings', authenticate, validate(listingCtrl.schemas.listSchema), listingCtrl.listListings);
router.get('/listings/stats', authenticate, listingCtrl.getMarketplaceStats);
router.get('/listings/:id', authenticate, listingCtrl.getListing);
router.post('/listings/:id/relist', authenticate, listingCtrl.relistListing);
router.post('/listings/:id/delist', authenticate, listingCtrl.delistListing);

// ========================
// MARKETPLACE CONNECTION ROUTES
// ========================
router.get('/marketplaces', authenticate, marketplaceCtrl.getMarketplaces);
router.get('/marketplaces/connections', authenticate, marketplaceCtrl.getConnections);
router.post('/marketplaces/connect', authenticate, validate(marketplaceCtrl.schemas.connectSchema), marketplaceCtrl.connectMarketplace);
router.delete('/marketplaces/:marketplaceId/disconnect', authenticate, marketplaceCtrl.disconnectMarketplace);
router.get('/marketplaces/:marketplaceId/oauth-url', authenticate, marketplaceCtrl.getOAuthUrl);
router.post('/marketplaces/connections/:connectionId/sync', authenticate, listingCtrl.syncMarketplace);

// ========================
// AI / PRICING ROUTES
// ========================
router.get('/ai/pricing/:productId', authenticate, requirePlan('ai'), aiCtrl.getSuggestedPrice);
router.get('/ai/demand/:productId', authenticate, requirePlan('ai'), aiCtrl.getDemandForecast);
router.post('/ai/markdowns/apply', authenticate, requirePlan('ai'), aiCtrl.applySmartMarkdowns);

// ========================
// SALES ROUTES
// ========================
router.get('/sales', authenticate, validate(salesCtrl.schemas.listSchema), salesCtrl.listSales);
router.get('/sales/summary', authenticate, salesCtrl.getSummary);
router.get('/sales/:id', authenticate, salesCtrl.getSale);
router.post('/sales/record', authenticate, validate(salesCtrl.schemas.recordSaleSchema), salesCtrl.recordSale);

// ========================
// IMAGE UPLOAD ROUTES
// ========================
router.post('/products/:productId/images', authenticate, ...imageCtrl.uploadSingle);
router.post('/products/:productId/images/bulk', authenticate, ...imageCtrl.uploadMultiple);
router.get('/products/:productId/images', authenticate, imageCtrl.getProductImages);
router.delete('/images/:imageId', authenticate, imageCtrl.deleteImage);
router.put('/products/:productId/images/reorder', authenticate, imageCtrl.reorderImages);
router.put('/products/:productId/images/:imageId/primary', authenticate, imageCtrl.setPrimary);
router.get('/products/:productId/images/presigned', authenticate, imageCtrl.getPresignedUrl);

// ========================
// GOOGLE SHEETS SYNC ROUTES
// ========================
router.post('/sync/sheets/full', authenticate, sheetsSyncCtrl.fullSync);
router.post('/sync/sheets/pull', authenticate, sheetsSyncCtrl.pullChanges);
router.post('/sync/sheets/products', authenticate, sheetsSyncCtrl.syncProducts);
router.post('/sync/sheets/listings', authenticate, sheetsSyncCtrl.syncListings);
router.post('/sync/sheets/sales', authenticate, sheetsSyncCtrl.syncSales);
router.get('/sync/status', authenticate, sheetsSyncCtrl.status);

// ========================
// HEALTH CHECK
// ========================
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'reseller-platform-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
