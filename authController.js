// src/controllers/authController.js
const Joi = require('joi');
const AuthService = require('../services/AuthService');
const { success, created } = require('../utils/response');

const registerSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    firstName: Joi.string().max(100).required(),
    lastName: Joi.string().max(100).required(),
    timezone: Joi.string().max(50).optional(),
  }),
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

const refreshSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

const register = async (req, res) => {
  const result = await AuthService.register(req.body);
  return created(res, result, 'Account created successfully');
};

const login = async (req, res) => {
  const result = await AuthService.login({
    ...req.body,
    deviceInfo: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  return success(res, result, 'Login successful');
};

const refreshToken = async (req, res) => {
  const result = await AuthService.refreshToken(req.body.refreshToken);
  return success(res, result, 'Token refreshed');
};

const logout = async (req, res) => {
  await AuthService.logout(req.user.id, req.body.refreshToken);
  return success(res, null, 'Logged out successfully');
};

const logoutAll = async (req, res) => {
  await AuthService.logoutAll(req.user.id);
  return success(res, null, 'Logged out from all devices');
};

const me = async (req, res) => {
  return success(res, req.user);
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  me,
  schemas: { registerSchema, loginSchema, refreshSchema },
};
