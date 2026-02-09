// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

/**
 * Verify JWT and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.auth.jwtSecret);

    const user = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'display_name', 'role', 'status', 'timezone')
      .where({ id: decoded.userId, status: 'active' })
      .first();

    if (!user) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Attach subscription info
    const subscription = await db('subscriptions')
      .where({ user_id: user.id })
      .orderBy('created_at', 'desc')
      .first();

    req.user = { ...user, subscription: subscription || { plan: 'free' } };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new AuthenticationError('Invalid token'));
    }
    next(err);
  }
};

/**
 * Optional auth - attaches user if token present, continues if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.auth.jwtSecret);
      const user = await db('users')
        .select('id', 'email', 'role', 'status')
        .where({ id: decoded.userId, status: 'active' })
        .first();
      if (user) req.user = user;
    }
  } catch (err) {
    // Silently continue without auth
  }
  next();
};

/**
 * Role-based access control
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError());
    }
    next();
  };
};

/**
 * Plan-based feature gating
 */
const requirePlan = (feature) => {
  return (req, res, next) => {
    if (!req.user || !req.user.subscription) {
      return next(new AuthorizationError('Subscription required'));
    }

    const sub = req.user.subscription;

    // Check specific feature flags
    const featureMap = {
      ai: sub.ai_features,
      automation: sub.automation_features,
      bulk: sub.bulk_operations,
      analytics: sub.analytics_advanced,
    };

    if (featureMap[feature] === false) {
      return next(
        new AuthorizationError(
          `This feature requires a paid plan. Please upgrade to access ${feature}.`
        )
      );
    }
    next();
  };
};

/**
 * Check listing limits
 */
const checkListingLimit = async (req, res, next) => {
  try {
    const sub = req.user.subscription;
    const activeListings = await db('listings')
      .where({ user_id: req.user.id })
      .whereIn('status', ['active', 'pending'])
      .count('id as count')
      .first();

    if (parseInt(activeListings.count) >= (sub.listing_limit || 25)) {
      return next(
        new AuthorizationError(
          `You've reached your listing limit of ${sub.listing_limit || 25}. Please upgrade your plan.`
        )
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  requirePlan,
  checkListingLimit,
};
