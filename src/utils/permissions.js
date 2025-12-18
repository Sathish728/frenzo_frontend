import {Platform, PermissionsAndroid, Alert, Linking} from 'react-native';

/**
 * FrndZone Permissions Handler
 * 
 * Required permissions:
 * - MICROPHONE: For voice calls (required)
 * - CAMERA: For future video calls (optional)
 * - SMS: For OTP auto-read (optional)
 * - NOTIFICATIONS: For incoming call alerts (required for Android 13+)
 * 
 * NOTE: We do NOT record calls - RECORD_AUDIO permission is for 
 * real-time microphone access during calls only, not for recording.
 */

/**
 * Request all necessary permissions for the app
 */
export const requestAllPermissions = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const permissions = [];

    // Microphone - Required for voice calls
    // Note: Android uses RECORD_AUDIO for microphone access, but we don't record anything
    permissions.push(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

    // Camera - For future video calls
    permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);

    // Phone state - To handle call interruptions
    permissions.push(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);

    // SMS permissions for OTP auto-read (Android 6+)
    if (Platform.Version >= 23) {
      permissions.push(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
      permissions.push(PermissionsAndroid.PERMISSIONS.READ_SMS);
    }

    // Notification permission for Android 13+
    if (Platform.Version >= 33) {
      permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    // Bluetooth for audio routing on Android 12+
    if (Platform.Version >= 31) {
      permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    }

    const results = await PermissionsAndroid.requestMultiple(permissions);
    
    console.log('Permission results:', results);

    // Check critical permission - microphone for calls
    const microphoneGranted = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === 'granted';
    
    if (!microphoneGranted) {
      Alert.alert(
        'Microphone Access Required',
        'FrndZone needs microphone access to make voice calls. Your calls are NOT recorded - this permission is only for live audio during calls.',
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
 * Request microphone permission for voice calls
 * Note: Android names this RECORD_AUDIO but we only use it for live call audio
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
        message: 'FrndZone needs microphone access for voice calls.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow',
      }
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Microphone permission granted');
      return true;
    } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Permission Required',
        'Microphone access is required for voice calls. Please enable it in app settings.',
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
 * Request camera permission for future video calls
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
        message: 'FrndZone needs camera access for video calls.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow',
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
 * Check if camera permission is granted
 */
export const checkCameraPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    return granted;
  } catch (error) {
    console.error('Check camera permission error:', error);
    return false;
  }
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
        buttonPositive: 'Allow',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Notification permission error:', error);
    return false;
  }
};

/**
 * Request call-related permissions (microphone + camera)
 */
export const requestCallPermissions = async () => {
  if (Platform.OS !== 'android') {
    return {microphone: true, camera: true};
  }

  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.CAMERA,
    ]);

    const microphone = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === 'granted';
    const camera = results[PermissionsAndroid.PERMISSIONS.CAMERA] === 'granted';

    if (!microphone) {
      Alert.alert(
        'Microphone Required',
        'Voice calls require microphone access. Please grant permission to make calls.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: openAppSettings},
        ]
      );
    }

    return {microphone, camera};
  } catch (error) {
    console.error('Call permissions error:', error);
    return {microphone: false, camera: false};
  }
};

/**
 * Open app settings
 */
export const openAppSettings = () => {
  Linking.openSettings();
};

export default {
  requestAllPermissions,
  requestMicrophonePermission,
  requestCameraPermission,
  requestSMSPermission,
  checkMicrophonePermission,
  checkCameraPermission,
  requestNotificationPermission,
  requestCallPermissions,
  openAppSettings,
};