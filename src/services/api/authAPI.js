import axiosInstance from './axiosConfig';

export const authAPI = {
  // Verify Firebase token with backend
  verifyFirebaseToken: (idToken, role, name) =>
    axiosInstance.post('/auth/firebase-verify', { 
      idToken, 
      role,
      name 
    }),
  
  // Refresh JWT token
  refreshToken: () =>
    axiosInstance.post('/auth/refresh-token'),
};