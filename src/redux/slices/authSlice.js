// src/redux/slices/authSlice.js
import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {authAPI} from '../../services/api/authAPI';
import {signOut as firebaseSignOut} from '../../config/firebase';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false, // This should always start as false
  error: null,
  otpSent: false,
  phoneNumber: null,
};

// ... rest of your thunks ...

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setPhoneNumber: (state, action) => {
      state.phoneNumber = action.payload;
    },
    setOtpSent: (state, action) => {
      state.otpSent = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false; // Always reset loading when setting error
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = {...state.user, ...action.payload};
      }
    },
    updateCoins: (state, action) => {
      if (state.user) {
        state.user.coins = action.payload;
      }
    },
    resetAuth: () => ({...initialState, isLoading: false}), // Ensure isLoading is false
    // Add this new action to reset loading state
    resetLoading: (state) => {
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Verify with backend
      .addCase(verifyWithBackend.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyWithBackend.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.otpSent = false;
        state.phoneNumber = null;
      })
      .addCase(verifyWithBackend.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Refresh token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        if (action.payload.user) {
          state.user = action.payload.user;
        }
      })
      // Logout
      .addCase(logout.fulfilled, () => ({...initialState, isLoading: false}))
      .addCase(logout.rejected, () => ({...initialState, isLoading: false}));
  },
});

export const {
  setPhoneNumber,
  setOtpSent,
  setLoading,
  setError,
  clearError,
  updateUser,
  updateCoins,
  resetAuth,
  resetLoading,
} = authSlice.actions;

export default authSlice.reducer;