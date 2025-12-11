import api from './axiosConfig';

export const paymentAPI = {
  // Get available coin packages
  getPackages: () => {
    return api.get('/api/payments/packages');
  },

  // Create payment order (Razorpay)
  createOrder: (packageId) => {
    return api.post('/api/payments/create-order', {packageId});
  },

  // Verify payment after Razorpay callback
  verifyPayment: (paymentData) => {
    return api.post('/api/payments/verify', paymentData);
  },

  // Get transaction history
  getTransactionHistory: (page = 1, limit = 20) => {
    return api.get(`/api/payments/transactions?page=${page}&limit=${limit}`);
  },

  // Get specific transaction
  getTransaction: (transactionId) => {
    return api.get(`/api/payments/transactions/${transactionId}`);
  },
};
