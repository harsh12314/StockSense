// client/src/features/receipts/receiptsApi.js
import { api } from '../../api/client';

export const receiptsApi = {
  /** GET /api/receipts?status=...&search=... */
  list: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/receipts${params ? `?${params}` : ''}`);
  },

  /** GET /api/receipts/:id */
  get: (id) => api.get(`/receipts/${id}`),

  /** POST /api/receipts */
  create: (data) => api.post('/receipts', data),

  /** PUT /api/receipts/:id/header — save from_contact & schedule_date */
  updateHeader: (id, data) => api.put(`/receipts/${id}/header`, data),

  /** GET /api/receipts/meta/products — product list for dropdown */
  listProducts: () => api.get('/receipts/meta/products'),

  /** POST /api/receipts/:id/lines */
  addLine: (id, line) => api.post(`/receipts/${id}/lines`, line),

  /** DELETE /api/receipts/:id/lines/:lineId */
  removeLine: (id, lineId) => api.delete(`/receipts/${id}/lines/${lineId}`),

  /** PUT /api/receipts/:id/todo  (Draft → Ready) */
  markReady: (id) => api.put(`/receipts/${id}/todo`),

  /** PUT /api/receipts/:id/validate  (Ready → Done + stock mutation) */
  validate: (id) => api.put(`/receipts/${id}/validate`),

  /** PUT /api/receipts/:id/cancel */
  cancel: (id) => api.put(`/receipts/${id}/cancel`),
};
