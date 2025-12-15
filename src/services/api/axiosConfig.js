import axios from 'axios';
import {API_URL} from '../../config/constants';

console.log('axiosConfig loaded: API_URL =', API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store for token (set from outside to avoid circular dependency)
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  console.log('Auth token set:', token ? 'Yes' : 'No');
};

export const clearAuthToken = () => {
  authToken = null;
};

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    // Debug log - show full URL
    const fullURL = config.baseURL + config.url;
    console.log('=== API Request ===');
    console.log('Method:', config.method?.toUpperCase());
    console.log('Full URL:', fullURL);
    console.log('==================');

    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response OK:', response.status);
    return response;
  },
  async (error) => {
    console.error('=== API Error ===');
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
    console.error('Data:', error.response?.data);
    console.error('================');

    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    }

    return Promise.reject(error);
  },
);

export default api;
