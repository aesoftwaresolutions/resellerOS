// src/api/endpoints.js
import client from './client';

// ---- Auth ----
export const auth = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  refresh: (refreshToken) => client.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => client.post('/auth/logout', { refreshToken }),
  me: () => client.get('/auth/me'),
};

// ---- Products ----
export const products = {
  list: (params) => client.get('/products', { params }),
  get: (id) => client.get(`/products/${id}`),
  create: (data) => client.post('/products', data),
  update: (id, data) => client.patch(`/products/${id}`, data),
  delete: (id) => client.delete(`/products/${id}`),
  bulkStatus: (data) => client.post('/products/bulk/status', data),
  stats: () => client.get('/products/stats'),
};

// ---- Listings ----
export const listings = {
  list: (params) => client.get('/listings', { params }),
  get: (id) => client.get(`/listings/${id}`),
  crossList: (data) => client.post('/listings/cross-list', data),
  bulkCrossList: (data) => client.post('/listings/bulk-cross-list', data),
  relist: (id) => client.post(`/listings/${id}/relist`),
  delist: (id) => client.post(`/listings/${id}/delist`),
  stats: () => client.get('/listings/stats'),
};

// ---- Marketplaces ----
export const marketplaces = {
  list: () => client.get('/marketplaces'),
  connections: () => client.get('/marketplaces/connections'),
  connect: (data) => client.post('/marketplaces/connect', data),
  disconnect: (id) => client.delete(`/marketplaces/${id}/disconnect`),
  getOAuthUrl: (id) => client.get(`/marketplaces/${id}/oauth-url`),
  sync: (connectionId) => client.post(`/marketplaces/connections/${connectionId}/sync`),
};

// ---- AI / Pricing ----
export const ai = {
  suggestedPrice: (productId) => client.get(`/ai/pricing/${productId}`),
  demandForecast: (productId) => client.get(`/ai/demand/${productId}`),
  applyMarkdowns: () => client.post('/ai/markdowns/apply'),
};

// ---- Sales ----
export const sales = {
  list: (params) => client.get('/sales', { params }),
  get: (id) => client.get(`/sales/${id}`),
  record: (data) => client.post('/sales/record', data),
  summary: (params) => client.get('/sales/summary', { params }),
};

// ---- Images ----
export const images = {
  upload: (productId, file, position = 0) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('position', position);
    return client.post(`/products/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMultiple: (productId, files) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    return client.post(`/products/${productId}/images/bulk`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (productId) => client.get(`/products/${productId}/images`),
  delete: (imageId) => client.delete(`/images/${imageId}`),
  reorder: (productId, imageIds) => client.put(`/products/${productId}/images/reorder`, { imageIds }),
  setPrimary: (productId, imageId) => client.put(`/products/${productId}/images/${imageId}/primary`),
};

// ---- Sync (Google Sheets + Supabase) ----
export const sync = {
  status: () => client.get('/sync/status'),
  fullSync: () => client.post('/sync/sheets/full'),
  pullChanges: () => client.post('/sync/sheets/pull'),
  syncProducts: () => client.post('/sync/sheets/products'),
  syncListings: () => client.post('/sync/sheets/listings'),
  syncSales: () => client.post('/sync/sheets/sales'),
};
