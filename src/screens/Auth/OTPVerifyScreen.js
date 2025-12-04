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
import { verifyOTPWithFirebase, resendOTP, clearAuthError } from '../../redux/thunks/authThunks';
import { selectAuthLoading, selectAuthError, selectIsNewUser } from '../../redux/slices/authSlice';
import firebaseAuthService from '../../config/firebase';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { theme } from '../../config/theme';

const OTPVerifyScreen = ({ route, navigation }) => {
  const { phone } = route.params;
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isNewUser = useSelector(selectIsNewUser);
  
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
      // Step 1: Verify OTP with Firebase
      const result = await firebaseAuthService.verifyOTP(otp);
      
      if (result.success) {
        // Step 2: Send Firebase ID token to backend
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

  const handleResendOTP = () => {
    dispatch(resendOTP(phone));
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
          <Text style={styles.emoji}>🔐</Text>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            {phone}
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="OTP Code"
            value={otp}
            onChangeText={(text) => {
              setOtp(text);
              setOtpError('');
            }}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            error={otpError}
            style={styles.otpInput}
          />

          {showRegistration && (
            <>
              <View style={styles.registrationNotice}>
                <Text style={styles.noticeText}>
                  ℹ️ New user detected. Please complete your profile:
                </Text>
              </View>

              <Input
                label="Your Name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setNameError('');
                }}
                placeholder="Enter your full name"
                error={nameError}
              />

              <Text style={styles.label}>Select Role *</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'men' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('men')}
                >
                  <Text style={styles.roleEmoji}>👨</Text>
                  <Text
                    style={[
                      styles.roleText,
                      role === 'men' && styles.roleTextActive,
                    ]}
                  >
                    Men (Caller)
                  </Text>
                  <Text style={styles.roleDesc}>Make calls to women</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'women' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('women')}
                >
                  <Text style={styles.roleEmoji}>👩</Text>
                  <Text
                    style={[
                      styles.roleText,
                      role === 'women' && styles.roleTextActive,
                    ]}
                  >
                    Women (Receiver)
                  </Text>
                  <Text style={styles.roleDesc}>Receive calls & earn</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Button
            title={showRegistration ? 'Complete Registration' : 'Verify OTP'}
            onPress={handleVerifyOTP}
            loading={loading}
            disabled={!otp || (showRegistration && (!name || !role))}
            style={styles.button}
          />

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendOTP}
            disabled={loading}
          >
            <Text style={styles.resendText}>
              Didn't receive code? Resend OTP
            </Text>
          </TouchableOpacity>
        </View>

        {error && !isNewUser && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
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
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
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
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  otpInput: {
    marginBottom: theme.spacing.lg,
  },
  registrationNotice: {
    backgroundColor: `${theme.colors.info}20`,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  noticeText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.info,
    lineHeight: 20,
  },
  label: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  roleButton: {
    flex: 1,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  roleButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  roleEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  roleText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textLight,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  roleTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  roleDesc: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: theme.spacing.md,
  },
  resendButton: {
    marginTop: theme.spacing.lg,
    alignSelf: 'center',
    padding: theme.spacing.sm,
  },
  resendText: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: `${theme.colors.danger}10`,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: `${theme.colors.danger}30`,
  },
  errorText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.danger,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default OTPVerifyScreen;