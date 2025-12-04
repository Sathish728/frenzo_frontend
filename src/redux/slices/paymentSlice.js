import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  packages: [],
  transactions: [],
  loading: false,
  error: null,
  processingPayment: false,
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    // Get Packages
    getPackagesStart: (state) => {
      state.loading = true;
    },
    getPackagesSuccess: (state, action) => {
      state.loading = false;
      state.packages = action.payload;
    },
    getPackagesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Create Order
    createOrderStart: (state) => {
      state.processingPayment = true;
      state.error = null;
    },
    createOrderSuccess: (state) => {
      state.processingPayment = false;
    },
    createOrderFailure: (state, action) => {
      state.processingPayment = false;
      state.error = action.payload;
    },

    // Verify Payment
    verifyPaymentStart: (state) => {
      state.processingPayment = true;
    },
    verifyPaymentSuccess: (state) => {
      state.processingPayment = false;
    },
    verifyPaymentFailure: (state, action) => {
      state.processingPayment = false;
      state.error = action.payload;
    },

    // Get Transaction History
    getTransactionsStart: (state) => {
      state.loading = true;
    },
    getTransactionsSuccess: (state, action) => {
      state.loading = false;
      state.transactions = action.payload;
    },
    getTransactionsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Clear error
    clearPaymentError: (state) => {
      state.error = null;
    },
  },
});

export const {
  getPackagesStart,
  getPackagesSuccess,
  getPackagesFailure,
  createOrderStart,
  createOrderSuccess,
  createOrderFailure,
  verifyPaymentStart,
  verifyPaymentSuccess,
  verifyPaymentFailure,
  getTransactionsStart,
  getTransactionsSuccess,
  getTransactionsFailure,
  clearPaymentError,
} = paymentSlice.actions;

export default paymentSlice.reducer;

// Selectors
export const selectPaymentPackages = (state) => state.payment.packages;
export const selectTransactions = (state) => state.payment.transactions;
export const selectPaymentLoading = (state) => state.payment.loading;
export const selectProcessingPayment = (state) => state.payment.processingPayment;
