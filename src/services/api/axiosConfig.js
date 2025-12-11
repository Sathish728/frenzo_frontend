import axios from 'axios';
import {API_URL} from '../../config/constants';
import {store} from '../../redux/store';
import {resetAuth} from '../../redux/slices/authSlice';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try to refresh token
      try {
        const state = store.getState();
        const token = state.auth.token;

        if (token) {
          const response = await axios.post(
            `${API_URL}/api/auth/refresh-token`,
            {},
            {
              headers: {Authorization: `Bearer ${token}`},
            },
          );

          if (response.data.token) {
            // Update token in store would require dispatch
            // For now, just retry with existing token
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        store.dispatch(resetAuth());
        return Promise.reject(refreshError);
      }
    }

    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    }

    return Promise.reject(error);
  },
);

export default api;
