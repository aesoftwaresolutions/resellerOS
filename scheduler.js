// src/jobs/scheduler.js
const cron = require('node-cron');
const db = require('../config/database');
const AutomationService = require('../services/automation/AutomationService');
const PricingAIService = require('../services/ai/PricingAIService');
const InventorySyncService = require('../services/inventory/InventorySyncService');
const logger = require('../utils/logger');

/**
 * Initialize all scheduled jobs
 */
function initScheduler() {
  logger.info('🕐 Initializing job scheduler...');

  // ==============================
  // Every 5 minutes: Process queued automation tasks
  // ==============================
  cron.schedule('*/5 * * * *', async () => {
    try {
      const tasks = await db('automation_tasks')
        .where({ status: 'queued' })
        .where('scheduled_for', '<=', new Date())
        .orWhere({ status: 'queued', scheduled_for: null })
        .orderBy('created_at', 'asc')
        .limit(20);

      for (const task of tasks) {
        try {
          await AutomationService.processTask(task.id);
        } catch (err) {
          logger.error(`Task ${task.id} failed:`, err.message);
        }
      }

      if (tasks.length > 0) {
        logger.info(`Processed ${tasks.length} automation tasks`);
      }
    } catch (err) {
      logger.error('Task processor error:', err.message);
    }
  });

  // ==============================
  // Every 15 minutes: Check for sales across all connected marketplaces
  // ==============================
  cron.schedule('*/15 * * * *', async () => {
    try {
      const connections = await db('marketplace_connections')
        .where({ status: 'connected' });

      for (const conn of connections) {
        try {
          await InventorySyncService.fullSync(conn.user_id, conn.id);
        } catch (err) {
          logger.warn(`Sync failed for connection ${conn.id}:`, err.message);
        }
      }
    } catch (err) {
      logger.error('Sale check error:', err.message);
    }
  });

  // ==============================
  // Every hour: Schedule automated shares
  // ==============================
  cron.schedule('0 * * * *', async () => {
    try {
      const users = await db('subscriptions')
        .where({ automation_features: true, status: 'active' })
        .select('user_id');

      for (const { user_id } of users) {
        await AutomationService.scheduleShares(user_id);
      }
    } catch (err) {
      logger.error('Share scheduler error:', err.message);
    }
  });

  // ==============================
  // Every 6 hours: Schedule automated offers
  // ==============================
  cron.schedule('0 */6 * * *', async () => {
    try {
      const users = await db('subscriptions')
        .where({ automation_features: true, status: 'active' })
        .select('user_id');

      for (const { user_id } of users) {
        await AutomationService.scheduleOffers(user_id);
      }
    } catch (err) {
      logger.error('Offer scheduler error:', err.message);
    }
  });

  // ==============================
  // Daily at 2 AM: Apply smart markdowns
  // ==============================
  cron.schedule('0 2 * * *', async () => {
    try {
      const users = await db('subscriptions')
        .where({ ai_features: true, status: 'active' })
        .select('user_id');

      for (const { user_id } of users) {
        await PricingAIService.applySmartMarkdowns(user_id);
      }

      logger.info(`Applied smart markdowns for ${users.length} users`);
    } catch (err) {
      logger.error('Markdown scheduler error:', err.message);
    }
  });

  // ==============================
  // Daily at 3 AM: Schedule automatic relists
  // ==============================
  cron.schedule('0 3 * * *', async () => {
    try {
      const users = await db('subscriptions')
        .where({ automation_features: true, status: 'active' })
        .select('user_id');

      for (const { user_id } of users) {
        await AutomationService.scheduleRelists(user_id);
      }
    } catch (err) {
      logger.error('Relist scheduler error:', err.message);
    }
  });

  // ==============================
  // Daily at 4 AM: Update days_listed counter
  // ==============================
  cron.schedule('0 4 * * *', async () => {
    try {
      await db.raw(`
        UPDATE products 
        SET days_listed = EXTRACT(DAY FROM NOW() - first_listed_at)::integer,
            updated_at = NOW()
        WHERE status = 'active' 
          AND first_listed_at IS NOT NULL
      `);
      logger.info('Updated days_listed counters');
    } catch (err) {
      logger.error('Days listed update error:', err.message);
    }
  });

  // ==============================
  // Daily at 5 AM: Generate daily analytics snapshots
  // ==============================
  cron.schedule('0 5 * * *', async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      const users = await db('users').where({ status: 'active' }).select('id');

      for (const { id: userId } of users) {
        await generateDailySnapshot(userId, dateStr);
      }

      logger.info(`Generated daily analytics for ${users.length} users`);
    } catch (err) {
      logger.error('Analytics snapshot error:', err.message);
    }
  });

  // ==============================
  // Weekly: Clean up expired refresh tokens and old tasks
  // ==============================
  cron.schedule('0 6 * * 0', async () => {
    try {
      const deletedTokens = await db('refresh_tokens')
        .where('expires_at', '<', new Date())
        .orWhere({ revoked: true })
        .del();

      const deletedTasks = await db('automation_tasks')
        .whereIn('status', ['completed', 'failed'])
        .where('created_at', '<', db.raw("NOW() - INTERVAL '30 days'"))
        .del();

      logger.info(`Cleanup: ${deletedTokens} expired tokens, ${deletedTasks} old tasks`);
    } catch (err) {
      logger.error('Cleanup error:', err.message);
    }
  });

  logger.info('✅ Job scheduler initialized');
}

async function generateDailySnapshot(userId, dateStr) {
  const [sales, listings] = await Promise.all([
    db('sales')
      .where({ user_id: userId })
      .whereRaw("DATE(sold_at) = ?", [dateStr])
      .whereNotIn('status', ['canceled', 'returned']),
    db('listings')
      .where({ user_id: userId, status: 'active' })
      .count('id as count')
      .first(),
  ]);

  const revenue = sales.reduce((sum, s) => sum + parseFloat(s.sale_price || 0), 0);
  const fees = sales.reduce((sum, s) => sum + parseFloat(s.marketplace_fee || 0), 0);
  const profit = sales.reduce((sum, s) => sum + parseFloat(s.profit || 0), 0);

  await db('analytics_daily')
    .insert({
      user_id: userId,
      date: dateStr,
      active_listings: parseInt(listings?.count || 0),
      items_sold: sales.length,
      revenue,
      fees,
      net_revenue: revenue - fees,
      profit,
    })
    .onConflict(['user_id', 'date', 'marketplace_id'])
    .merge();
}

module.exports = { initScheduler };

// ==============================
// NOTE: Google Sheets pull sync is registered separately
// to respect the configurable interval.
// ==============================
const config = require('../config');
if (config.googleSheets.enabled) {
  const pullMin = config.googleSheets.pullIntervalMinutes;
  cron.schedule(`*/${pullMin} * * * *`, async () => {
    try {
      const GoogleSheetsSync = require('../services/sync/GoogleSheetsSync');
      const users = await db('users').where({ status: 'active' }).select('id');
      for (const { id: userId } of users) {
        const result = await GoogleSheetsSync.pullProductChanges(userId);
        if (result.updated > 0) {
          logger.info(`Sheets pull: ${result.updated} product changes from Sheet for user ${userId}`);
        }
      }
    } catch (err) {
      logger.error('Sheets pull sync error:', err.message);
    }
  });
  logger.info(`📊 Google Sheets pull sync scheduled every ${pullMin} min`);
}
