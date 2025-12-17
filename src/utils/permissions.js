import {Platform, PermissionsAndroid, Alert, Linking} from 'react-native';

/**
 * Request all necessary permissions for the app
 */
export const requestAllPermissions = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    ];

    // Add SMS permissions (optional - for OTP auto-read)
    if (Platform.Version >= 23) {
      permissions.push(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
      permissions.push(PermissionsAndroid.PERMISSIONS.READ_SMS);
    }

    // Add notification permission for Android 13+
    if (Platform.Version >= 33) {
      permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    // Add Bluetooth permission for Android 12+
    if (Platform.Version >= 31) {
      permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    }

    const results = await PermissionsAndroid.requestMultiple(permissions);
    
    console.log('Permission results:', results);

    // Check critical permissions
    const audioGranted = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === 'granted';
    
    if (!audioGranted) {
      Alert.alert(
        'Microphone Permission Required',
        'FrndZone needs microphone access to make voice calls. Please enable it in Settings.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: openAppSettings},
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
};

/**
 * Request microphone permission specifically
 */
export const requestMicrophonePermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'FrndZone needs access to your microphone to make voice calls.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Microphone permission granted');
      return true;
    } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Permission Required',
        'Microphone permission is required for calls. Please enable it in app settings.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: openAppSettings},
        ]
      );
      return false;
    } else {
      console.log('Microphone permission denied');
      return false;
    }
  } catch (error) {
    console.error('Microphone permission error:', error);
    return false;
  }
};

/**
 * Request camera permission
 */
export const requestCameraPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'FrndZone needs access to your camera for video calls.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Camera permission error:', error);
    return false;
  }
};

/**
 * Request SMS permission for OTP auto-read
 */
export const requestSMSPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    ]);

    return (
      results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === 'granted' ||
      results[PermissionsAndroid.PERMISSIONS.READ_SMS] === 'granted'
    );
  } catch (error) {
    console.error('SMS permission error:', error);
    return false;
  }
};

/**
 * Check if microphone permission is granted
 */
export const checkMicrophonePermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    return granted;
  } catch (error) {
    console.error('Check permission error:', error);
    return false;
  }
};

/**
 * Open app settings
 */
export const openAppSettings = () => {
  Linking.openSettings();
};

/**
 * Request notification permission (Android 13+)
 */
export const requestNotificationPermission = async () => {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'Notification Permission',
        message: 'FrndZone needs to send you notifications for incoming calls.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Notification permission error:', error);
    return false;
  }
};

export default {
  requestAllPermissions,
  requestMicrophonePermission,
  requestCameraPermission,
  requestSMSPermission,
  checkMicrophonePermission,
  requestNotificationPermission,
  openAppSettings,
};
