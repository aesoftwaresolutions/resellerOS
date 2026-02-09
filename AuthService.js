// src/services/AuthService.js
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const db = require('../config/database');
const UserModel = require('../models/User');
const { AuthenticationError, ConflictError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Register a new user
   */
  async register({ email, password, firstName, lastName, timezone }) {
    // Check if user exists
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    // Create user
    const user = await UserModel.createUser({
      email,
      password,
      firstName,
      lastName,
      timezone,
    });

    // Create default free subscription
    await db('subscriptions').insert({
      user_id: user.id,
      plan: 'free',
      status: 'active',
      listing_limit: 25,
      marketplace_limit: 2,
      ai_features: false,
      automation_features: false,
      bulk_operations: false,
      analytics_advanced: false,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    logger.info(`New user registered: ${user.email}`, { userId: user.id });

    return {
      user: UserModel.toPublicProfile(user),
      ...tokens,
    };
  }

  /**
   * Login with email and password
   */
  async login({ email, password, deviceInfo, ipAddress }) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new AuthenticationError('Account is suspended or deactivated');
    }

    const valid = await UserModel.verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new AuthenticationError('Invalid email or password');
    }

    await UserModel.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user, { deviceInfo, ipAddress });

    logger.info(`User logged in: ${user.email}`, { userId: user.id });

    return {
      user: UserModel.toPublicProfile(user),
      ...tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.auth.jwtRefreshSecret);

      // Verify refresh token exists and is not revoked
      const storedToken = await db('refresh_tokens')
        .where({ token: refreshToken, revoked: false })
        .where('expires_at', '>', new Date())
        .first();

      if (!storedToken) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      const user = await UserModel.findById(storedToken.user_id);
      if (!user || user.status !== 'active') {
        throw new AuthenticationError('User not found or inactive');
      }

      // Revoke old refresh token (rotation)
      await db('refresh_tokens').where({ id: storedToken.id }).update({ revoked: true });

      // Issue new tokens
      return this.generateTokens(user);
    } catch (err) {
      if (err instanceof AuthenticationError) throw err;
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(userId, refreshToken) {
    if (refreshToken) {
      await db('refresh_tokens')
        .where({ user_id: userId, token: refreshToken })
        .update({ revoked: true });
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await db('refresh_tokens')
      .where({ user_id: userId, revoked: false })
      .update({ revoked: true });
  }

  /**
   * Generate JWT access and refresh tokens
   */
  async generateTokens(user, { deviceInfo, ipAddress } = {}) {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tokenId: uuidv4() },
      config.auth.jwtRefreshSecret,
      { expiresIn: config.auth.jwtRefreshExpiresIn }
    );

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db('refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      device_info: deviceInfo,
      ip_address: ipAddress,
      expires_at: expiresAt,
    });

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();
