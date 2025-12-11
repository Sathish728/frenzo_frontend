import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS, FONTS, SPACING, RADIUS} from '../../config/constants';
import {signInWithPhone} from '../../config/firebase';
import {setPhoneNumber, setOtpSent, setLoading, setError} from '../../redux/slices/authSlice';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import {validatePhone, sanitizePhone} from '../../utils/helpers';

const PhoneLoginScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {isLoading, error} = useSelector((state) => state.auth);
  
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleSendOTP = async () => {
    // Validate phone
    const cleanPhone = sanitizePhone(phone);
    if (!validatePhone(cleanPhone)) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }
    setPhoneError('');

    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const result = await signInWithPhone(cleanPhone);
      
      if (result.success) {
        dispatch(setPhoneNumber(cleanPhone));
        dispatch(setOtpSent(true));
        navigation.navigate('OTPVerify', {
          confirmation: result.confirmation,
          phone: cleanPhone,
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to send OTP');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={COLORS.gradientPrimary}
              style={styles.logoBackground}>
              <Icon name="heart-multiple" size={48} color={COLORS.white} />
            </LinearGradient>
            <Text style={styles.appName}>FrndZone</Text>
            <Text style={styles.tagline}>Connect, Call, Earn</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>
              Enter your phone number to continue
            </Text>

            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter 10-digit number"
              keyboardType="phone-pad"
              maxLength={10}
              leftIcon="phone"
              error={phoneError}
            />

            <Button
              title="Send OTP"
              onPress={handleSendOTP}
              loading={isLoading}
              fullWidth
              icon="arrow-right"
              iconPosition="right"
              style={styles.button}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
              <Text style={styles.linkText}>Terms of Service</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoBackground: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  appName: {
    fontSize: FONTS.xxxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  button: {
    marginTop: SPACING.sm,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONTS.sm,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: COLORS.primary,
  },
});

export default PhoneLoginScreen;
