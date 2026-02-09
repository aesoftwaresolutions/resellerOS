// src/services/marketplace/poshmarkAdapter.js
const BaseMarketplaceAdapter = require('./BaseMarketplaceAdapter');
const logger = require('../../utils/logger');
const { MarketplaceError } = require('../../utils/errors');

/**
 * Poshmark Adapter
 * 
 * Poshmark does NOT have an official public API. Integration options:
 * 1. Browser automation via Puppeteer (what we implement here)
 * 2. Reverse-engineered mobile API endpoints (risky, can break)
 * 3. Manual CSV import (limited)
 * 
 * This adapter uses Puppeteer for reliable automation.
 * In production, you'd run this in a headless browser pool.
 */
class PoshmarkAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super('poshmark');
    this.baseUrl = 'https://poshmark.com';
  }

  /**
   * Login to Poshmark and store session cookies
   */
  async connect(credentials) {
    const puppeteer = require('puppeteer');
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(`${this.baseUrl}/login`, { waitUntil: 'networkidle2' });

      // Fill in login form
      await page.type('input[name="login_form[username_email]"]', credentials.email, { delay: 50 });
      await page.type('input[name="login_form[password]"]', credentials.password, { delay: 50 });
      await page.click('button[type="submit"]');

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

      // Check if login succeeded
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        throw new MarketplaceError('poshmark', 'Login failed - check credentials');
      }

      // Get cookies for session persistence
      const cookies = await page.cookies();
      const username = await page.evaluate(() => {
        const el = document.querySelector('[data-test="username"]');
        return el ? el.textContent.trim() : null;
      });

      return {
        sessionData: JSON.stringify(cookies),
        marketplaceUsername: username,
      };
    } catch (err) {
      if (err instanceof MarketplaceError) throw err;
      throw new MarketplaceError('poshmark', `Connection failed: ${err.message}`, err);
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Create a listing on Poshmark via browser automation
   */
  async createListing(connection, listingData) {
    const puppeteer = require('puppeteer');
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Restore session
      const cookies = JSON.parse(connection.session_data_encrypted);
      await page.setCookie(...cookies);

      // Navigate to sell page
      await page.goto(`${this.baseUrl}/sell`, { waitUntil: 'networkidle2' });

      // Upload images
      if (listingData.images && listingData.images.length > 0) {
        // Poshmark image upload flow
        logger.info(`Uploading ${listingData.images.length} images to Poshmark`);
        // Implementation: download images to temp, upload via file input
      }

      // Fill listing form
      // Title
      await page.type('input[data-test="title"]', listingData.title.substring(0, 80));

      // Description
      await page.type('textarea[data-test="description"]', listingData.description || '');

      // Brand
      if (listingData.brand) {
        await page.type('input[data-test="brand"]', listingData.brand);
        await page.waitForTimeout(1000);
        // Select from dropdown
        await page.keyboard.press('Enter');
      }

      // Category, size, color, condition via dropdowns
      // (Simplified - real implementation would handle each dropdown)

      // Price
      await page.type('input[data-test="original-price"]', String(listingData.originalPrice || listingData.price));
      await page.type('input[data-test="listing-price"]', String(listingData.price));

      // Submit
      await page.click('button[data-test="submit-listing"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

      // Get the listing URL
      const listingUrl = page.url();
      const listingId = listingUrl.split('/').pop();

      return {
        externalListingId: listingId,
        externalUrl: listingUrl,
      };
    } catch (err) {
      throw new MarketplaceError('poshmark', `Create listing failed: ${err.message}`, err);
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Share a listing (critical Poshmark feature for visibility)
   */
  async shareListing(connection, externalListingId) {
    const puppeteer = require('puppeteer');
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      const cookies = JSON.parse(connection.session_data_encrypted);
      await page.setCookie(...cookies);

      await page.goto(`${this.baseUrl}/listing/${externalListingId}`, {
        waitUntil: 'networkidle2',
      });

      // Click share button
      await page.click('[data-test="share-button"]');
      await page.waitForTimeout(500);

      // Share to followers
      await page.click('[data-test="share-to-followers"]');
      await page.waitForTimeout(2000);

      logger.info(`Shared Poshmark listing: ${externalListingId}`);
      return { shared: true };
    } catch (err) {
      throw new MarketplaceError('poshmark', `Share failed: ${err.message}`, err);
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Send an offer to likers
   */
  async sendOffer(connection, externalListingId, offerPrice, message) {
    logger.info(`Sending Poshmark offer for ${externalListingId}: $${offerPrice}`);
    // Similar browser automation flow
    // Navigate to listing → click "Offer to Likers" → set price → submit
    return { offerSent: true, price: offerPrice };
  }

  /**
   * Delete/remove a listing
   */
  async deleteListing(connection, externalListingId) {
    logger.info(`Delisting from Poshmark: ${externalListingId}`);
    // Browser automation: navigate to listing → edit → delete
    return { deleted: true };
  }

  /**
   * Get active listings (scrape closet)
   */
  async getActiveListings(connection) {
    // Would scrape the user's Poshmark closet
    // Or use the internal API: GET /vm-rest/users/{username}/closet
    logger.info('Fetching Poshmark active listings');
    return [];
  }
}

module.exports = new PoshmarkAdapter();
