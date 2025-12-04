
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  availableWomen: [],
  loading: false,
  error: null,
  refreshing: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Get Profile
    getProfileStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    getProfileSuccess: (state, action) => {
      state.loading = false;
      state.profile = action.payload;
    },
    getProfileFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Update Profile
    updateProfileStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateProfileSuccess: (state, action) => {
      state.loading = false;
      state.profile = { ...state.profile, ...action.payload };
    },
    updateProfileFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Get Available Women
    getAvailableWomenStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    getAvailableWomenSuccess: (state, action) => {
      state.loading = false;
      state.availableWomen = action.payload;
      state.refreshing = false;
    },
    getAvailableWomenFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.refreshing = false;
    },

    // Refresh Women List
    refreshWomenList: (state) => {
      state.refreshing = true;
    },

    // Update Women List (Socket.IO)
    updateWomenList: (state, action) => {
      state.availableWomen = action.payload;
    },

    // Update Coins
    updateCoins: (state, action) => {
      if (state.profile) {
        state.profile.coins = action.payload;
      }
    },

    // Toggle Availability
    toggleAvailabilityStart: (state) => {
      state.loading = true;
    },
    toggleAvailabilitySuccess: (state, action) => {
      state.loading = false;
      if (state.profile) {
        state.profile.isAvailable = action.payload;
      }
    },
    toggleAvailabilityFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Clear error
    clearUserError: (state) => {
      state.error = null;
    },
  },
});

export const {
  getProfileStart,
  getProfileSuccess,
  getProfileFailure,
  updateProfileStart,
  updateProfileSuccess,
  updateProfileFailure,
  getAvailableWomenStart,
  getAvailableWomenSuccess,
  getAvailableWomenFailure,
  refreshWomenList,
  updateWomenList,
  updateCoins,
  toggleAvailabilityStart,
  toggleAvailabilitySuccess,
  toggleAvailabilityFailure,
  clearUserError,
} = userSlice.actions;

export default userSlice.reducer;

// Selectors
export const selectUserProfile = (state) => state.user.profile;
export const selectAvailableWomen = (state) => state.user.availableWomen;
export const selectUserLoading = (state) => state.user.loading;
export const selectUserCoins = (state) => state.user.profile?.coins || 0;