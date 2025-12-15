import api from './axiosConfig';

export const authAPI = {
  // Verify Firebase token with backend
  // For existing users: only idToken is needed - backend auto-logs them in
  // For new users: idToken, role, and name are needed
  verifyFirebaseToken: (idToken, role = null, name = null) => {
    return api.post('/auth/firebase-verify', {
      idToken,
      role,
      name,
    });
  },

  // Refresh JWT token
  refreshToken: () => {
    return api.post('/auth/refresh-token');
  },

  // Get current user info
  getCurrentUser: () => {
    return api.get('/auth/me');
  },

  // Verify current token
  verifyToken: () => {
    return api.get('/auth/verify-token');
  },
};
