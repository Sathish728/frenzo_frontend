// src/config/firebase.js
import auth from '@react-native-firebase/auth';

class FirebaseAuthService {
  constructor() {
    this.auth = auth();
    this.confirmResult = null;
  }

  /**
   * Send OTP to phone number
   */
  async sendOTP(phoneNumber) {
    try {
      // Format phone number with country code
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+91${phoneNumber}`;

      console.log('📱 Sending OTP to:', formattedPhone);

      // Send verification code
      this.confirmResult = await this.auth.signInWithPhoneNumber(formattedPhone);

      console.log('✅ OTP sent successfully');
      return {
        success: true,
        verificationId: this.confirmResult.verificationId,
      };
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(code) {
    try {
      if (!this.confirmResult) {
        throw new Error('No verification in progress. Please request OTP first.');
      }

      console.log('🔐 Verifying OTP...');

      // Confirm verification code
      const userCredential = await this.confirmResult.confirm(code);
      
      // Get ID token for backend authentication
      const idToken = await userCredential.user.getIdToken();

      console.log('✅ OTP verified successfully');

      return {
        success: true,
        user: userCredential.user,
        idToken,
        phoneNumber: userCredential.user.phoneNumber,
      };
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(phoneNumber) {
    return this.sendOTP(phoneNumber);
  }

  /**
   * Get current user ID token (for API calls)
   */
  async getCurrentUserToken() {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }
      return await currentUser.getIdToken(true);
    } catch (error) {
      console.error('❌ Get token error:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      await this.auth.signOut();
      this.confirmResult = null;
      console.log('👋 User signed out');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.auth.currentUser;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback) {
    return this.auth.onAuthStateChanged(callback);
  }

  /**
   * Handle Firebase errors with user-friendly messages
   */
  handleFirebaseError(error) {
    console.log('🔥 Firebase error code:', error.code);
    
    switch (error.code) {
      case 'auth/invalid-phone-number':
        return new Error('Invalid phone number format');
      
      case 'auth/invalid-verification-code':
        return new Error('Invalid OTP code. Please try again.');
      
      case 'auth/code-expired':
        return new Error('OTP code expired. Please request a new one.');
      
      case 'auth/too-many-requests':
        return new Error('Too many attempts. Please try again later.');
      
      case 'auth/session-expired':
        return new Error('Session expired. Please request OTP again.');
      
      case 'auth/network-request-failed':
        return new Error('Network error. Please check your connection.');
      
      case 'auth/quota-exceeded':
        return new Error('SMS quota exceeded. Please try again later.');
      
      case 'auth/missing-verification-code':
        return new Error('Please enter the verification code.');
      
      case 'auth/missing-phone-number':
        return new Error('Please enter a phone number.');
      
      default:
        return new Error(error.message || 'Authentication failed. Please try again.');
    }
  }
}

export default new FirebaseAuthService();