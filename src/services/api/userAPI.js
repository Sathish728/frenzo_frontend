import api from './axiosConfig';

export const userAPI = {
  // Get user profile
  getProfile: () => {
    return api.get('/api/users/profile');
  },

  // Update user profile
  updateProfile: (data) => {
    return api.put('/api/users/profile', data);
  },

  // Get available women (for men)
  getAvailableWomen: () => {
    return api.get('/api/users/available-women');
  },

  // Toggle availability (for women)
  toggleAvailability: (isAvailable) => {
    return api.post('/api/users/toggle-availability', {isAvailable});
  },

  // Report a user
  reportUser: (userId, reason) => {
    return api.post('/api/users/report', {userId, reason});
  },

  // Block a user
  blockUser: (userId) => {
    return api.post('/api/users/block', {userId});
  },

  // Get blocked users
  getBlockedUsers: () => {
    return api.get('/api/users/blocked');
  },

  // Unblock a user
  unblockUser: (userId) => {
    return api.delete(`/api/users/blocked/${userId}`);
  },
};
