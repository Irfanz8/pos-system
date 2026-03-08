import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cashier_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cashier_token');
      localStorage.removeItem('cashier_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const productsApi = {
  getAll: (params?: any) => api.get('/products', { params }),
};

export const categoriesApi = {
  getAll: () => api.get('/categories'),
};

export const transactionsApi = {
  create: (data: { items: any[]; paid: number; paymentMethod: string; customerId?: string; redeemPoints?: number; outletId?: string }) => api.post('/transactions', data),
  getAll: (params?: any) => api.get('/transactions', { params }),
  getByReceipt: (receiptNo: string) => api.get(`/transactions/receipt/${receiptNo}`),
};

export const customersApi = {
  getByPhone: (phone: string) => api.get(`/customers/by-phone/${phone}`),
  create: (data: { name: string; phone: string; email?: string }) => api.post('/customers', data),
};

export const outletsApi = {
  getAll: () => api.get('/outlets'),
};


export const emailApi = {
  sendReceipt: (email: string, transactionId: string) => api.post('/email/send-receipt', { email, transactionId }),
};

export const shiftsApi = {
  clockIn: (outletId: string, cashStart: number) => api.post('/shifts/clock-in', { outletId, cashStart }),
  clockOut: (cashEnd: number) => api.post('/shifts/clock-out', { cashEnd }),
  getCurrent: () => api.get('/shifts/current'),
};
