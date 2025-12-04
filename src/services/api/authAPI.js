import axiosInstance from './axiosConfig';

export const authAPI = {
  /**
   * Verify Firebase ID token with backend
   * Backend will validate the token and create/login user
   */
  verifyFirebaseToken: async (idToken, role, name) => {
    try {
      const response = await axiosInstance.post('/auth/firebase-verify', { 
        idToken, 
        role,
        name 
      });
      return response;
    } catch (error) {
      console.error('❌ Firebase token verification failed:', error);
      throw error;
    }
  },
  
  /**
   * Verify if JWT token is still valid
   */
  verifyToken: async () => {
    try {
      const response = await axiosInstance.get('/auth/verify-token');
      return response;
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      throw error;
    }
  },

  /**
   * Refresh JWT token
   */
  refreshToken: async () => {
    try {
      const response = await axiosInstance.post('/auth/refresh-token');
      return response;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw error;
    }
  },
};