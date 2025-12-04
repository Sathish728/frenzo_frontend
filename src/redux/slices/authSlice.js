import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  token: null,
  user: null,
  loading: false,
  error: null,
  otpSent: false,
  isNewUser: false,
  phoneNumber: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Send OTP
    sendOTPStart: (state, action) => {
      state.loading = true;
      state.error = null;
      state.phoneNumber = action.payload;
    },
    sendOTPSuccess: (state) => {
      state.loading = false;
      state.otpSent = true;
    },
    sendOTPFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.otpSent = false;
    },

    // Verify OTP with Firebase
    verifyOTPWithFirebaseStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    verifyOTPWithFirebaseSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.otpSent = false;
      state.isNewUser = false;
    },
    verifyOTPWithFirebaseFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload.message;
      state.isNewUser = action.payload.isNewUser || false;
    },

    // Logout
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.otpSent = false;
      state.error = null;
      state.phoneNumber = null;
      state.isNewUser = false;
    },

    // Clear error
    clearAuthError: (state) => {
      state.error = null;
    },

    // Update user data
    updateUserData: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },

    // Set new user flag
    setIsNewUser: (state, action) => {
      state.isNewUser = action.payload;
    },
  },
});

export const {
  sendOTPStart,
  sendOTPSuccess,
  sendOTPFailure,
  verifyOTPWithFirebaseStart,
  verifyOTPWithFirebaseSuccess,
  verifyOTPWithFirebaseFailure,
  logout,
  clearAuthError,
  updateUserData,
  setIsNewUser,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectCurrentUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectOTPSent = (state) => state.auth.otpSent;
export const selectIsNewUser = (state) => state.auth.isNewUser;
export const selectPhoneNumber = (state) => state.auth.phoneNumber;