// src/screens/Auth/OTPVerifyScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOTPWithFirebase, clearAuthError } from '../../redux/slices/authSlice';
import firebaseService from '../../services/firebase.service';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { theme } from '../../config/theme';

const OTPVerifyScreen = ({ route, navigation }) => {
  const { phone } = route.params;
  const dispatch = useDispatch();
  const { loading, error, isNewUser } = useSelector((state) => state.auth);
  
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (isNewUser) {
      setShowRegistration(true);
    }
  }, [isNewUser]);

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const validateOTP = (code) => {
    if (!/^\d{6}$/.test(code)) {
      return 'OTP must be 6 digits';
    }
    return null;
  };

  const validateName = (nameText) => {
    if (nameText.length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (nameText.length > 50) {
      return 'Name must not exceed 50 characters';
    }
    return null;
  };

  const handleVerifyOTP = async () => {
    setOtpError('');
    
    const error = validateOTP(otp);
    if (error) {
      setOtpError(error);
      return;
    }

    if (showRegistration) {
      setNameError('');
      const nameErr = validateName(name);
      if (nameErr) {
        setNameError(nameErr);
        return;
      }
      if (!role) {
        Alert.alert('Error', 'Please select your role');
        return;
      }
    }

    try {
      // Verify OTP with Firebase
      const result = await firebaseService.verifyOTP(otp);
      
      if (result.success) {
        // Send Firebase ID token to backend
        dispatch(verifyOTPWithFirebase({
          idToken: result.idToken,
          role: showRegistration ? role : undefined,
          name: showRegistration ? name : undefined,
        }));
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Invalid OTP');
    }
  };

  const handleResendOTP = async () => {
    try {
      await firebaseService.sendOTP(phone);
      Alert.alert('Success', 'OTP sent successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to {phone}
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="OTP"
            value={otp}
            onChangeText={(text) => {
              setOtp(text);
              setOtpError('');
            }}
            placeholder="Enter 6-digit OTP"
            keyboardType="number-pad"
            maxLength={6}
            error={otpError}
          />

          {showRegistration && (
            <>
              <Input
                label="Your Name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setNameError('');
                }}
                placeholder="Enter your name"
                error={nameError}
              />

              <Text style={styles.label}>Select Role</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'men' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('men')}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === 'men' && styles.roleTextActive,
                    ]}
                  >
                    👨 Men (Caller)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'women' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('women')}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === 'women' && styles.roleTextActive,
                    ]}
                  >
                    👩 Women (Receiver)
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Button
            title={showRegistration ? 'Register' : 'Verify OTP'}
            onPress={handleVerifyOTP}
            loading={loading}
            disabled={!otp || (showRegistration && (!name || !role))}
          />

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendOTP}
          >
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        </View>

        {error && !isNewUser && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: theme.fonts.sizes.xxxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textLight,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  roleButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}20`,
  },
  roleText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textLight,
  },
  roleTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  resendButton: {
    marginTop: theme.spacing.md,
    alignSelf: 'center',
  },
  resendText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.danger,
    textAlign: 'center',
  },
});

export default OTPVerifyScreen;