import { paymentAPI } from '../../services/api/paymentAPI';
import {
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
} from '../slices/paymentSlice';
import { updateCoins } from '../slices/userSlice';
import Toast from 'react-native-toast-message';

export const fetchPackages = () => async (dispatch) => {
  dispatch(getPackagesStart());
  try {
    const response = await paymentAPI.getPackages();
    dispatch(getPackagesSuccess(response.data));
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to fetch packages';
    dispatch(getPackagesFailure(errorMessage));
  }
};

export const createOrder = (amount, coins) => async (dispatch) => {
  dispatch(createOrderStart());
  try {
    const response = await paymentAPI.createOrder(amount, coins);
    dispatch(createOrderSuccess());
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to create order';
    dispatch(createOrderFailure(errorMessage));
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: errorMessage,
    });
    throw error;
  }
};

export const verifyPayment = (orderId, paymentId, signature) => async (dispatch) => {
  dispatch(verifyPaymentStart());
  try {
    const response = await paymentAPI.verifyPayment(orderId, paymentId, signature);
    dispatch(verifyPaymentSuccess());
    dispatch(updateCoins(response.data.coins));
    
    Toast.show({
      type: 'success',
      text1: 'Payment Successful',
      text2: 'Coins added to your account',
    });
    
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Payment verification failed';
    dispatch(verifyPaymentFailure(errorMessage));
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: errorMessage,
    });
    throw error;
  }
};

export const fetchTransactions = (page = 1) => async (dispatch) => {
  dispatch(getTransactionsStart());
  try {
    const response = await paymentAPI.getTransactionHistory(page);
    dispatch(getTransactionsSuccess(response.data.transactions));
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to fetch transactions';
    dispatch(getTransactionsFailure(errorMessage));
  }
};