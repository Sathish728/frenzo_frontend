import axiosInstance from './axiosConfig';

export const paymentAPI = {
  getPackages: () => axiosInstance.get('/payments/packages'),
  
  createOrder: (amount, coins) =>
    axiosInstance.post('/payments/create-order', { amount, coins }),
  
  verifyPayment: (orderId, paymentId, signature) =>
    axiosInstance.post('/payments/verify', { orderId, paymentId, signature }),
  
  getTransactionHistory: (page = 1) =>
    axiosInstance.get(`/payments/history?page=${page}`),
};