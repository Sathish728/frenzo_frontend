// src/screens/Auth/PhoneLoginScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { sendOTP, clearAuthError } from '../../redux/slices/authSlice';
import firebaseService from '../../services/firebase.service';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { theme } from '../../config/theme';

const PhoneLoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error, otpSent } = useSelector((state) => state.auth);
  
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

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

  const handleSendOTP = async () => {
    setPhoneError('');
    
    const error = validatePhone(phone);
    if (error) {
      setPhoneError(error);
      return;
    }

    try {
      // Send OTP using Firebase
      const result = await firebaseService.sendOTP(phone);
      
      if (result.success) {
        // Navigate to OTP screen
        navigation.navigate('OTPVerify', { 
          phone,
          verificationId: result.verificationId 
        });
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
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
          <Text style={styles.title}>Welcome Back</Text>
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
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            maxLength={15}
            error={phoneError || error}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📱 We'll send you a 6-digit verification code
            </Text>
          </View>

          <Button
            title="Send OTP"
            onPress={handleSendOTP}
            loading={loading}
            disabled={!phone || loading}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
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