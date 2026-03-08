import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// Products
export const productsApi = {
  getAll: (params?: { categoryId?: string; search?: string }) =>
    api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

// Categories
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// Transactions
export const transactionsApi = {
  getAll: (params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    api.get('/transactions', { params }),
  getById: (id: string) => api.get(`/transactions/${id}`),
  getByReceipt: (receiptNo: string) => api.get(`/transactions/receipt/${receiptNo}`),
  create: (data: any) => api.post('/transactions', data),
  void: (id: string, reason: string) => api.post(`/transactions/${id}/void`, { reason }),
};

// Users
export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Reports
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  daily: (date?: string) => api.get('/reports/daily', { params: { date } }),
  topProducts: () => api.get('/reports/top-products'),
  weeklySales: () => api.get('/reports/weekly-sales'),
  lowStock: (threshold?: number) => api.get('/reports/low-stock', { params: { threshold } }),
  paymentBreakdown: () => api.get('/reports/payment-breakdown'),
  comparison: () => api.get('/reports/comparison'),
};

// Stock Management
// Stock Management
export const stockApi = {
  getMovements: (productId: string, params?: { page?: number; limit?: number; outletId?: string }) =>
    api.get(`/stock/movements/${productId}`, { params }),
  getAllMovements: (params?: { type?: string; startDate?: string; endDate?: string; outletId?: string }) =>
    api.get('/stock/movements', { params }),
  adjust: (data: { productId: string; outletId: string; type: string; quantity: number; reason?: string }) =>
    api.post('/stock/adjust', data),
  opname: (items: { productId: string; outletId: string; actualStock: number; reason?: string }[]) =>
    api.post('/stock/opname', { items }),
};

// Customers (Loyalty)
export const customersApi = {
  getAll: (params?: { search?: string; tier?: string; page?: number; limit?: number }) =>
    api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  getByPhone: (phone: string) => api.get(`/customers/by-phone/${phone}`),
  create: (data: { name: string; phone: string; email?: string }) =>
    api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  addPoints: (id: string, amount: number, type: 'add' | 'redeem') =>
    api.post(`/customers/${id}/points`, { amount, type }),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

// Promos
export const promosApi = {
  getAll: (params?: { search?: string; isActive?: string; type?: string }) =>
    api.get('/promos', { params }),
  getById: (id: string) => api.get(`/promos/${id}`),
  create: (data: any) => api.post('/promos', data),
  update: (id: string, data: any) => api.put(`/promos/${id}`, data),
  delete: (id: string) => api.delete(`/promos/${id}`),
  validate: (data: { code: string; total?: number; items?: any[] }) =>
    api.post('/promos/validate', data),
};

// Outlets
export const outletsApi = {
  getAll: () => api.get('/outlets'),
  create: (data: any) => api.post('/outlets', data),
  update: (id: string, data: any) => api.put(`/outlets/${id}`, data),
  delete: (id: string) => api.delete(`/outlets/${id}`),
};

// AI Features
export const aiApi = {
  getSalesPrediction: (outletId?: string) => api.get('/ai/sales-prediction', { params: { outletId } }),
  getStockRecommendations: (outletId?: string) => api.get('/ai/stock-recommendations', { params: { outletId } }),
  getAnomalies: (outletId?: string) => api.get('/ai/anomalies', { params: { outletId } }),
};

