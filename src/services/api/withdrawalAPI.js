import api from './axiosConfig';

export const withdrawalAPI = {
  // Request withdrawal
  requestWithdrawal: (amount, upiId) => {
    return api.post('/api/withdrawals/request', {amount, upiId});
  },

  // Get withdrawal history
  getWithdrawalHistory: (page = 1, limit = 20) => {
    return api.get(`/api/withdrawals/history?page=${page}&limit=${limit}`);
  },

  // Get earnings summary
  getEarnings: () => {
    return api.get('/api/withdrawals/earnings');
  },

  // Get specific withdrawal
  getWithdrawal: (withdrawalId) => {
    return api.get(`/api/withdrawals/${withdrawalId}`);
  },

  // Cancel pending withdrawal
  cancelWithdrawal: (withdrawalId) => {
    return api.post(`/api/withdrawals/${withdrawalId}/cancel`);
  },
};
