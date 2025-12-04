import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { sendOTP, clearAuthError } from '../../redux/thunks/authThunks';
import { selectAuthLoading, selectAuthError, selectOTPSent } from '../../redux/slices/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { theme } from '../../config/theme';

const PhoneLoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const otpSent = useSelector(selectOTPSent);
  
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    // Navigate to OTP screen when OTP is sent
    if (otpSent) {
      navigation.navigate('OTPVerify', { phone });
    }
  }, [otpSent, navigation, phone]);

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const validatePhone = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      return 'Phone number must be at least 10 digits';
    }
    if (cleaned.length > 15) {
      return 'Phone number is too long';
    }
    return null;
  };

  const handleSendOTP = () => {
    setPhoneError('');
    
    const error = validatePhone(phone);
    if (error) {
      setPhoneError(error);
      return;
    }

    dispatch(sendOTP(phone));
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
          <Text style={styles.emoji}>📱</Text>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to continue
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              setPhoneError('');
            }}
            placeholder="+91 1234567890"
            keyboardType="phone-pad"
            maxLength={15}
            error={phoneError || error}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📨 We'll send you a 6-digit verification code via SMS
            </Text>
          </View>

          <Button
            title="Send OTP"
            onPress={handleSendOTP}
            loading={loading}
            disabled={!phone || loading}
            style={styles.button}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{'\n'}
            Terms of Service and Privacy Policy
          </Text>
        </View>
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
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  infoBox: {
    backgroundColor: `${theme.colors.info}10`,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  infoText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textLight,
    lineHeight: 20,
  },
  button: {
    marginTop: theme.spacing.md,
  },
  footer: {
    marginTop: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PhoneLoginScreen;