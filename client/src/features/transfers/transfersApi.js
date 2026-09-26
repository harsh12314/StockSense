// client/src/features/transfers/transfersApi.js
import { get, post, del, put } from '../../api/client';

export const transfersApi = {
  /**
   * List transfers with optional filters
   * @param {Object} params - { status, search }
   */
  async list(params = {}) {
    const res = await get('/transfers', params);
    return res.data || [];
  },

  /**
   * Get aggregate statistics for internal transfers
   */
  async stats() {
    const res = await get('/transfers/stats');
    return res.data || {
      total_count: 0,
      draft_count: 0,
      ready_count: 0,
      done_count: 0,
      canceled_count: 0,
    };
  },

  /**
   * Get transfer details with line items and source stock levels
   * @param {number|string} id
   */
  async getById(id) {
    const res = await get(`/transfers/${id}`);
    return res.data;
  },

  /**
   * Create a new transfer header (and optional initial lines)
   * @param {Object} payload - { from_location_id, to_location_id, transfer_date, lines }
   */
  async create(payload) {
    const res = await post('/transfers', payload);
    return res.data;
  },

  /**
   * Add a line item to a transfer
   * @param {number|string} transferId
   * @param {Object} line - { product_id, quantity }
   */
  async addLine(transferId, line) {
    const res = await post(`/transfers/${transferId}/lines`, line);
    return res.data;
  },

  /**
   * Remove a line item from a transfer
   * @param {number|string} transferId
   * @param {number|string} lineId
   */
  async removeLine(transferId, lineId) {
    const res = await del(`/transfers/${transferId}/lines/${lineId}`);
    return res.data;
  },

  /**
   * Validate and complete transfer atomically:
   * Decrements source stock, increments destination stock, logs move_history, sets status=done
   * @param {number|string} id
   */
  async validate(id) {
    const res = await post(`/transfers/${id}/validate`);
    return res.data;
  },

  /**
   * Mark transfer as ready for processing
   * @param {number|string} id
   */
  async markReady(id) {
    const res = await post(`/transfers/${id}/ready`);
    return res.data;
  },

  /**
   * Cancel transfer
   * @param {number|string} id
   */
  async cancel(id) {
    const res = await post(`/transfers/${id}/cancel`);
    return res.data;
  },

  /**
   * Reference data helpers
   */
  async getLocations() {
    const res = await get('/ref/locations');
    return res.data || [];
  },

  async getProducts() {
    const res = await get('/ref/products');
    return res.data || [];
  },
};

export default transfersApi;
