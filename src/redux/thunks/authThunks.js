import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api/authAPI';
import firebaseAuthService from '../../config/firebase';
import {
  sendOTPStart,
  sendOTPSuccess,
  sendOTPFailure,
  verifyOTPStart,
  verifyOTPSuccess,
  verifyOTPFailure,
} from '../slices/authSlice';
import Toast from 'react-native-toast-message';

// Step 1: Send OTP via Firebase
export const sendOTP = (phoneNumber) => async (dispatch) => {
  dispatch(sendOTPStart());
  try {
    await firebaseAuthService.sendOTP(phoneNumber);
    dispatch(sendOTPSuccess());
    
    Toast.show({
      type: 'success',
      text1: 'OTP Sent',
      text2: 'Check your phone for the verification code',
    });
  } catch (error) {
    dispatch(sendOTPFailure(error.message));
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: error.message,
    });
  }
};

// Step 2: Verify OTP and authenticate with backend
export const verifyOTP = (phoneNumber, otp, role = null, name = null) => async (dispatch) => {
  dispatch(verifyOTPStart());
  try {
    // Step 2a: Verify OTP with Firebase
    const { idToken } = await firebaseAuthService.verifyOTP(otp);
    
    console.log('✅ Firebase OTP verified, sending to backend...');

    // Step 2b: Send Firebase token to backend
    const response = await authAPI.verifyFirebaseToken(idToken, role, name);
    
    // Check if new user needs registration
    if (response.data.user.isNewUser) {
      dispatch(verifyOTPFailure({
        message: 'Please complete registration',
        isNewUser: true,
      }));
      return;
    }

    // Step 2c: Save JWT token from backend
    await AsyncStorage.multiSet([
      ['token', response.data.token],
      ['userId', response.data.user.id],
      ['userRole', response.data.user.role],
    ]);

    dispatch(verifyOTPSuccess({
      token: response.data.token,
      user: response.data.user,
    }));
    
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Login successful',
    });
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Verification failed';
    
    dispatch(verifyOTPFailure({
      message: errorMessage,
      isNewUser: error.response?.data?.user?.isNewUser || false,
    }));
    
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: errorMessage,
    });
  }
};

// Resend OTP
export const resendOTP = (phoneNumber) => async (dispatch) => {
  try {
    await firebaseAuthService.resendOTP(phoneNumber);
    Toast.show({
      type: 'success',
      text1: 'OTP Resent',
      text2: 'Please check your phone',
    });
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: error.message,
    });
  }
};

// Logout
export const logoutUser = () => async (dispatch) => {
  try {
    await firebaseAuthService.signOut();
    await AsyncStorage.multiRemove(['token', 'userId', 'userRole']);
    dispatch({ type: 'auth/logout' });
    
    Toast.show({
      type: 'info',
      text1: 'Logged Out',
      text2: 'You have been logged out',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
};