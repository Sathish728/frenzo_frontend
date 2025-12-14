// src/redux/slices/authSlice.js
import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {authAPI} from '../../services/api/authAPI';
import {signOut as firebaseSignOut} from '../../config/firebase';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  otpSent: false,
  phoneNumber: null,
};

// Verify Firebase token with backend
export const verifyWithBackend = createAsyncThunk(
  'auth/verifyWithBackend',
  async ({idToken, role, name}, {rejectWithValue}) => {
    try {
      const response = await authAPI.verifyFirebaseToken(idToken, role, name);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Verification failed',
      );
    }
  },
);

// Refresh token
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, {rejectWithValue}) => {
    try {
      const response = await authAPI.refreshToken();
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Token refresh failed',
      );
    }
  },
);

// Logout
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, {rejectWithValue}) => {
    try {
      await firebaseSignOut();
      return true;
    } catch (error) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  },
);

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
      state.isLoading = false;
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
    resetAuth: () => ({...initialState, isLoading: false}),
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