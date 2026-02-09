// src/models/User.js
const bcrypt = require('bcryptjs');
const BaseModel = require('./BaseModel');
const config = require('../config');

class User extends BaseModel {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    return this.query().where({ email: email.toLowerCase().trim() }).first();
  }

  async createUser(data) {
    const passwordHash = await bcrypt.hash(data.password, config.auth.bcryptSaltRounds);
    return this.create({
      email: data.email.toLowerCase().trim(),
      password_hash: passwordHash,
      first_name: data.firstName,
      last_name: data.lastName,
      display_name: data.displayName || `${data.firstName} ${data.lastName}`.trim(),
      timezone: data.timezone || 'America/New_York',
    });
  }

  async verifyPassword(plainText, hash) {
    return bcrypt.compare(plainText, hash);
  }

  async updateLastLogin(userId) {
    return this.update(userId, { last_login_at: this.db.fn.now() });
  }

  toPublicProfile(user) {
    const { password_hash, email_verification_token, password_reset_token, password_reset_expires, ...publicUser } = user;
    return publicUser;
  }
}

module.exports = new User();
