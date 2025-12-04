import axiosInstance from './axiosConfig';

export const withdrawalAPI = {
  requestWithdrawal: (upiId) =>
    axiosInstance.post('/withdrawals/request', { upiId }),
  
  getWithdrawalHistory: (page = 1) =>
    axiosInstance.get(`/withdrawals/history?page=${page}`),
  
  getEarnings: () => axiosInstance.get('/withdrawals/earnings'),
};