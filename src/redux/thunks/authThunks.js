import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api/authAPI';
import firebaseAuthService from '../../config/firebase';
import {
  sendOTPStart,
  sendOTPSuccess,
  sendOTPFailure,
  verifyOTPWithFirebaseStart,
  verifyOTPWithFirebaseSuccess,
  verifyOTPWithFirebaseFailure,
  logout as logoutAction,
} from '../slices/authSlice';
import Toast from 'react-native-toast-message';

/**
 * Step 1: Send OTP via Firebase
 */
export const sendOTP = (phoneNumber) => async (dispatch) => {
  dispatch(sendOTPStart(phoneNumber));
  try {
    await firebaseAuthService.sendOTP(phoneNumber);
    dispatch(sendOTPSuccess());
    
    Toast.show({
      type: 'success',
      text1: 'OTP Sent',
      text2: 'Check your phone for the verification code',
      visibilityTime: 3000,
    });
  } catch (error) {
    dispatch(sendOTPFailure(error.message));
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: error.message,
      visibilityTime: 4000,
    });
  }
};

/**
 * Step 2: Verify OTP with Firebase and authenticate with backend
 */
export const verifyOTPWithFirebase = ({ idToken, role, name }) => async (dispatch) => {
  dispatch(verifyOTPWithFirebaseStart());
  try {
    console.log('🔐 Verifying with backend...', { role, name });

    // Send Firebase ID token to backend for verification
    const response = await authAPI.verifyFirebaseToken(idToken, role, name);
    
    console.log('✅ Backend response:', response);

    // Check if user needs to complete registration
    if (response.user?.isNewUser) {
      dispatch(verifyOTPWithFirebaseFailure({
        message: 'Please complete registration',
        isNewUser: true,
      }));
      return;
    }

    // Save JWT token and user info
    await AsyncStorage.multiSet([
      ['token', response.token],
      ['userId', response.user.id],
      ['userRole', response.user.role],
    ]);

    dispatch(verifyOTPWithFirebaseSuccess({
      token: response.token,
      user: response.user,
    }));
    
    Toast.show({
      type: 'success',
      text1: 'Welcome!',
      text2: `Logged in as ${response.user.role}`,
      visibilityTime: 2000,
    });
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Verification failed';
    
    dispatch(verifyOTPWithFirebaseFailure({
      message: errorMessage,
      isNewUser: error.response?.data?.user?.isNewUser || false,
    }));
    
    Toast.show({
      type: 'error',
      text1: 'Authentication Failed',
      text2: errorMessage,
      visibilityTime: 4000,
    });
  }
};

/**
 * Resend OTP
 */
export const resendOTP = (phoneNumber) => async (dispatch) => {
  try {
    await firebaseAuthService.resendOTP(phoneNumber);
    Toast.show({
      type: 'success',
      text1: 'OTP Resent',
      text2: 'Please check your phone',
      visibilityTime: 3000,
    });
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: error.message,
      visibilityTime: 4000,
    });
  }
};

/**
 * Logout user
 */
export const logoutUser = () => async (dispatch) => {
  try {
    // Sign out from Firebase
    await firebaseAuthService.signOut();
    
    // Clear local storage
    await AsyncStorage.multiRemove(['token', 'userId', 'userRole']);
    
    // Clear Redux state
    dispatch(logoutAction());
    
    Toast.show({
      type: 'info',
      text1: 'Logged Out',
      text2: 'You have been logged out successfully',
      visibilityTime: 2000,
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to logout',
      visibilityTime: 3000,
    });
  }
};

/**
 * Check if user is already authenticated (on app start)
 */
export const checkAuthStatus = () => async (dispatch) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const userId = await AsyncStorage.getItem('userId');
    const userRole = await AsyncStorage.getItem('userRole');

    if (token && userId && userRole) {
      // Verify token is still valid
      try {
        const response = await authAPI.verifyToken();
        dispatch(verifyOTPWithFirebaseSuccess({
          token,
          user: response.user,
        }));
      } catch (error) {
        // Token is invalid, clear storage
        await AsyncStorage.multiRemove(['token', 'userId', 'userRole']);
        dispatch(logoutAction());
      }
    }
  } catch (error) {
    console.error('❌ Check auth status error:', error);
  }
};