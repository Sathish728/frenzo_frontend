import { userAPI } from '../../services/api/userAPI';
import {
  getProfileStart,
  getProfileSuccess,
  getProfileFailure,
  updateProfileStart,
  updateProfileSuccess,
  updateProfileFailure,
  getAvailableWomenStart,
  getAvailableWomenSuccess,
  getAvailableWomenFailure,
  toggleAvailabilityStart,
  toggleAvailabilitySuccess,
  toggleAvailabilityFailure,
} from '../slices/userSlice';
import { updateUserData } from '../slices/authSlice';
import Toast from 'react-native-toast-message';

export const fetchProfile = () => async (dispatch) => {
  dispatch(getProfileStart());
  try {
    const response = await userAPI.getProfile();
    dispatch(getProfileSuccess(response.data));
    dispatch(updateUserData(response.data));
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to fetch profile';
    dispatch(getProfileFailure(errorMessage));
  }
};

export const updateProfile = (data) => async (dispatch) => {
  dispatch(updateProfileStart());
  try {
    const response = await userAPI.updateProfile(data);
    dispatch(updateProfileSuccess(response.data));
    dispatch(updateUserData(response.data));
    
    Toast.show({
      type: 'success',
      text1: 'Profile Updated',
      text2: 'Your profile has been updated successfully',
    });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to update profile';
    dispatch(updateProfileFailure(errorMessage));
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: errorMessage,
    });
  }
};

export const fetchAvailableWomen = () => async (dispatch) => {
  dispatch(getAvailableWomenStart());
  try {
    const response = await userAPI.getAvailableWomen();
    dispatch(getAvailableWomenSuccess(response.data));
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to fetch women list';
    dispatch(getAvailableWomenFailure(errorMessage));
  }
};

export const toggleAvailability = (isAvailable) => async (dispatch) => {
  dispatch(toggleAvailabilityStart());
  try {
    await userAPI.toggleAvailability(isAvailable);
    dispatch(toggleAvailabilitySuccess(isAvailable));
    
    Toast.show({
      type: 'info',
      text1: isAvailable ? 'You are now online' : 'You are now offline',
    });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to toggle availability';
    dispatch(toggleAvailabilityFailure(errorMessage));
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: errorMessage,
    });
  }
};

export const reportUser = (userId, reason) => async (dispatch) => {
  try {
    await userAPI.reportUser(userId, reason);
    Toast.show({
      type: 'success',
      text1: 'Report Submitted',
      text2: 'Thank you for reporting',
    });
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to submit report';
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: errorMessage,
    });
  }
};
