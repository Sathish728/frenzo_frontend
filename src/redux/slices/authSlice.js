import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  token: null,
  user: null,
  loading: false,
  error: null,
  otpSent: false,
  isNewUser: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Send OTP
    sendOTPStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    sendOTPSuccess: (state) => {
      state.loading = false;
      state.otpSent = true;
    },
    sendOTPFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Verify OTP
    verifyOTPStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    verifyOTPSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.otpSent = false;
    },
    verifyOTPFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isNewUser = action.payload.isNewUser || false;
    },

    // Logout
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.otpSent = false;
      state.error = null;
    },

    // Clear error
    clearAuthError: (state) => {
      state.error = null;
    },

    // Update user data
    updateUserData: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
  },
});

export const {
  sendOTPStart,
  sendOTPSuccess,
  sendOTPFailure,
  verifyOTPStart,
  verifyOTPSuccess,
  verifyOTPFailure,
  logout,
  clearAuthError,
  updateUserData,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectCurrentUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
