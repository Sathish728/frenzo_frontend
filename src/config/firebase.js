import auth from '@react-native-firebase/auth';

// Firebase Auth instance
export const firebaseAuth = auth();

// Phone Auth
export const signInWithPhone = async (phoneNumber) => {
  try {
    // Format phone number with country code if not present
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber}`;
    
    const confirmation = await firebaseAuth.signInWithPhoneNumber(formattedPhone);
    return {success: true, confirmation};
  } catch (error) {
    console.error('Phone sign in error:', error);
    return {success: false, error: error.message};
  }
};

// Verify OTP
export const verifyOTP = async (confirmation, otp) => {
  try {
    const credential = await confirmation.confirm(otp);
    return {success: true, user: credential.user};
  } catch (error) {
    console.error('OTP verification error:', error);
    return {success: false, error: error.message};
  }
};

// Get ID Token
export const getIdToken = async () => {
  try {
    const user = firebaseAuth.currentUser;
    if (user) {
      const token = await user.getIdToken(true);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Get token error:', error);
    return null;
  }
};

// Sign Out
export const signOut = async () => {
  try {
    await firebaseAuth.signOut();
    return {success: true};
  } catch (error) {
    console.error('Sign out error:', error);
    return {success: false, error: error.message};
  }
};

// Auth State Listener
export const onAuthStateChanged = (callback) => {
  return firebaseAuth.onAuthStateChanged(callback);
};

// Get Current User
export const getCurrentUser = () => {
  return firebaseAuth.currentUser;
};
