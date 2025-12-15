import api from './axiosConfig';

export const paymentAPI = {
  // Get available coin packages
  getPackages: () => {
    return api.get('/payments/packages');
  },

  // Create payment order (Razorpay)
  createOrder: (packageId, amount, coins) => {
    return api.post('/payments/create-order', {
      packageId,
      amount,
      coins,
    });
  },

  // Verify payment after Razorpay callback
  verifyPayment: (paymentData) => {
    return api.post('/payments/verify', paymentData);
  },

  // Verify UPI payment (for manual verification)
  verifyUPIPayment: (orderId) => {
    return api.post('/payments/verify-upi', { orderId });
  },

  // Check payment status
  checkPaymentStatus: (orderId) => {
    return api.get(`/payments/status/${orderId}`);
  },

  // Get transaction history
  getTransactionHistory: (page = 1, limit = 20) => {
    return api.get(`/payments/transactions?page=${page}&limit=${limit}`);
  },
};