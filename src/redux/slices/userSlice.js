import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {userAPI} from '../../services/api/userAPI';

const initialState = {
  availableWomen: [],
  isLoadingWomen: false,
  profile: null,
  isOnline: false,
  isAvailable: false,
  error: null,
};

// Fetch available women
export const fetchAvailableWomen = createAsyncThunk(
  'user/fetchAvailableWomen',
  async (_, {rejectWithValue}) => {
    try {
      const response = await userAPI.getAvailableWomen();
      return response.data.women || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch women',
      );
    }
  },
);

// Fetch profile
export const fetchProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, {rejectWithValue}) => {
    try {
      const response = await userAPI.getProfile();
      return response.data.user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch profile',
      );
    }
  },
);

// Update profile
export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (data, {rejectWithValue}) => {
    try {
      const response = await userAPI.updateProfile(data);
      return response.data.user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update profile',
      );
    }
  },
);

// Toggle availability (for women)
export const toggleAvailability = createAsyncThunk(
  'user/toggleAvailability',
  async (isAvailable, {rejectWithValue}) => {
    try {
      const response = await userAPI.toggleAvailability(isAvailable);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to toggle availability',
      );
    }
  },
);

// Report user
export const reportUser = createAsyncThunk(
  'user/reportUser',
  async ({userId, reason}, {rejectWithValue}) => {
    try {
      const response = await userAPI.reportUser(userId, reason);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to report user',
      );
    }
  },
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAvailableWomen: (state, action) => {
      state.availableWomen = action.payload;
    },
    updateWomanStatus: (state, action) => {
      const {userId, isOnline, isAvailable} = action.payload;
      const index = state.availableWomen.findIndex((w) => w._id === userId);
      if (index !== -1) {
        if (isOnline !== undefined) {
          state.availableWomen[index].isOnline = isOnline;
        }
        if (isAvailable !== undefined) {
          state.availableWomen[index].isAvailable = isAvailable;
        }
      }
    },
    addWoman: (state, action) => {
      const exists = state.availableWomen.find(
        (w) => w._id === action.payload._id,
      );
      if (!exists) {
        state.availableWomen.unshift(action.payload);
      }
    },
    removeWoman: (state, action) => {
      state.availableWomen = state.availableWomen.filter(
        (w) => w._id !== action.payload,
      );
    },
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },
    setAvailabilityStatus: (state, action) => {
      state.isAvailable = action.payload;
    },
    clearUserError: (state) => {
      state.error = null;
    },
    resetUser: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch available women
      .addCase(fetchAvailableWomen.pending, (state) => {
        state.isLoadingWomen = true;
        state.error = null;
      })
      .addCase(fetchAvailableWomen.fulfilled, (state, action) => {
        state.isLoadingWomen = false;
        state.availableWomen = action.payload;
      })
      .addCase(fetchAvailableWomen.rejected, (state, action) => {
        state.isLoadingWomen = false;
        state.error = action.payload;
      })
      // Fetch profile
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.isOnline = action.payload.isOnline;
        state.isAvailable = action.payload.isAvailable;
      })
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      // Toggle availability
      .addCase(toggleAvailability.fulfilled, (state, action) => {
        state.isAvailable = action.payload.isAvailable;
        state.isOnline = action.payload.isOnline;
      });
  },
});

export const {
  setAvailableWomen,
  updateWomanStatus,
  addWoman,
  removeWoman,
  setOnlineStatus,
  setAvailabilityStatus,
  clearUserError,
  resetUser,
} = userSlice.actions;

export default userSlice.reducer;
