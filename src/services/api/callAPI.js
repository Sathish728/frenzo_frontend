import axiosInstance from './axiosConfig';

export const callAPI = {
  getICEServers: () => axiosInstance.get('/calls/ice-servers'),
  
  getCallHistory: (page = 1) => axiosInstance.get(`/calls/history?page=${page}`),
  
  getCallStats: () => axiosInstance.get('/calls/stats'),
};