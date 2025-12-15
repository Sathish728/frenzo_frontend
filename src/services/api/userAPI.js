import api from './axiosConfig';

export const userAPI = {
  // Get user profile
  getProfile: () => {
    return api.get('/users/profile');
  },

  // Update user profile
  updateProfile: (data) => {
    return api.put('/users/profile', data);
  },

  // Get available women (for men)
  getAvailableWomen: () => {
    return api.get('/users/available-women');
  },

  // Toggle availability (for women)
  toggleAvailability: (isAvailable) => {
    return api.post('/users/toggle-availability', {isAvailable});
  },

  // Report a user
  reportUser: (userId, reason) => {
    return api.post('/users/report', {userId, reason});
  },

  // Block a user
  blockUser: (userId) => {
    return api.post('/users/block', {userId});
  },

  // Get blocked users
  getBlockedUsers: () => {
    return api.get('/users/blocked');
  },

  // Unblock a user
  unblockUser: (userId) => {
    return api.delete(`/users/blocked/${userId}`);
  },
};

export default userAPI;