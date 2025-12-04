import axiosInstance from './axiosConfig';

export const userAPI = {
  getProfile: () => axiosInstance.get('/users/profile'),
  
  updateProfile: (data) => axiosInstance.put('/users/profile', data),
  
  getAvailableWomen: () => axiosInstance.get('/users/available-women'),
  
  toggleAvailability: (isAvailable) =>
    axiosInstance.put('/users/availability', { isAvailable }),
  
  reportUser: (userId, reason) =>
    axiosInstance.post('/users/report', { userId, reason }),
};