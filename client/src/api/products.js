// client/src/api/products.js
import api from './client';

export const productsApi = {
  // Categories
  getCategories: () => api.get('/categories').then((r) => r.data),
  createCategory: (name) => api.post('/categories', { name }).then((r) => r.data),

  // Products
  getProducts: (params) => api.get('/products', { params }).then((r) => r.data),
  getProduct: (id) => api.get(`/products/${id}`).then((r) => r.data),
  createProduct: (data) => api.post('/products', data).then((r) => r.data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data).then((r) => r.data),
  deleteProduct: (id) => api.delete(`/products/${id}`).then((r) => r.data),
  updateStock: (id, data) => api.patch(`/products/${id}/stock`, data).then((r) => r.data),
};
