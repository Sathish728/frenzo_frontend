import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {paymentAPI} from '../../services/api/paymentAPI';
import {withdrawalAPI} from '../../services/api/withdrawalAPI';

const initialState = {
  packages: [],
  transactions: [],
  withdrawals: [],
  earnings: {
    total: 0,
    withdrawn: 0,
    available: 0,
  },
  isLoading: false,
  isProcessing: false,
  error: null,
};

// Fetch coin packages
export const fetchPackages = createAsyncThunk(
  'payment/fetchPackages',
  async (_, {rejectWithValue}) => {
    try {
      const response = await paymentAPI.getPackages();
      return response.data.packages;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch packages',
      );
    }
  },
);

// Create payment order
export const createOrder = createAsyncThunk(
  'payment/createOrder',
  async (packageId, {rejectWithValue}) => {
    try {
      const response = await paymentAPI.createOrder(packageId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create order',
      );
    }
  },
);

// Verify payment
export const verifyPayment = createAsyncThunk(
  'payment/verifyPayment',
  async (paymentData, {rejectWithValue}) => {
    try {
      const response = await paymentAPI.verifyPayment(paymentData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Payment verification failed',
      );
    }
  },
);

// Fetch transaction history
export const fetchTransactions = createAsyncThunk(
  'payment/fetchTransactions',
  async (_, {rejectWithValue}) => {
    try {
      const response = await paymentAPI.getTransactionHistory();
      return response.data.transactions;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch transactions',
      );
    }
  },
);

// Fetch earnings (for women)
export const fetchEarnings = createAsyncThunk(
  'payment/fetchEarnings',
  async (_, {rejectWithValue}) => {
    try {
      const response = await withdrawalAPI.getEarnings();
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch earnings',
      );
    }
  },
);

// Request withdrawal
export const requestWithdrawal = createAsyncThunk(
  'payment/requestWithdrawal',
  async ({amount, upiId}, {rejectWithValue}) => {
    try {
      const response = await withdrawalAPI.requestWithdrawal(amount, upiId);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Withdrawal request failed',
      );
    }
  },
);

// Fetch withdrawal history
export const fetchWithdrawals = createAsyncThunk(
  'payment/fetchWithdrawals',
  async (_, {rejectWithValue}) => {
    try {
      const response = await withdrawalAPI.getWithdrawalHistory();
      return response.data.withdrawals;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch withdrawals',
      );
    }
  },
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    clearPaymentError: (state) => {
      state.error = null;
    },
    setProcessing: (state, action) => {
      state.isProcessing = action.payload;
    },
    updateEarnings: (state, action) => {
      state.earnings = {...state.earnings, ...action.payload};
    },
    resetPayment: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch packages
      .addCase(fetchPackages.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPackages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.packages = action.payload;
      })
      .addCase(fetchPackages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create order
      .addCase(createOrder.pending, (state) => {
        state.isProcessing = true;
      })
      .addCase(createOrder.fulfilled, (state) => {
        state.isProcessing = false;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload;
      })
      // Verify payment
      .addCase(verifyPayment.pending, (state) => {
        state.isProcessing = true;
      })
      .addCase(verifyPayment.fulfilled, (state) => {
        state.isProcessing = false;
      })
      .addCase(verifyPayment.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload;
      })
      // Fetch transactions
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload;
      })
      // Fetch earnings
      .addCase(fetchEarnings.fulfilled, (state, action) => {
        state.earnings = action.payload.earnings;
      })
      // Request withdrawal
      .addCase(requestWithdrawal.pending, (state) => {
        state.isProcessing = true;
      })
      .addCase(requestWithdrawal.fulfilled, (state) => {
        state.isProcessing = false;
      })
      .addCase(requestWithdrawal.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload;
      })
      // Fetch withdrawals
      .addCase(fetchWithdrawals.fulfilled, (state, action) => {
        state.withdrawals = action.payload;
      });
  },
});

export const {
  clearPaymentError,
  setProcessing,
  updateEarnings,
  resetPayment,
} = paymentSlice.actions;

export default paymentSlice.reducer;
