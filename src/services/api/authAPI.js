import api from './axiosConfig';

export const authAPI = {
  // Verify Firebase token with backend
  verifyFirebaseToken: (idToken, role, name) => {
    return api.post('/api/auth/firebase-verify', {
      idToken,
      role,
      name,
    });
  },

  // Refresh JWT token
  refreshToken: () => {
    return api.post('/api/auth/refresh-token');
  },

  // Verify current token
  verifyToken: () => {
    return api.get('/api/auth/verify-token');
  },

  // Demo login (for testing without Firebase)
  demoLogin: (phone, role, name) => {
    return api.post('/api/auth/demo-login', {
      phone,
      role,
      name,
    });
  },
};
