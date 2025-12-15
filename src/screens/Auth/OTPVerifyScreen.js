import React, {useState, useEffect} from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS, FONTS, SPACING, RADIUS} from '../../config/constants';
import {verifyOTP, getIdToken, signInWithPhone} from '../../config/firebase';
import {verifyWithBackend, setLoading, setError, clearError} from '../../redux/slices/authSlice';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import {validateOTP, validateName, formatPhone} from '../../utils/helpers';

const OTPVerifyScreen = ({navigation, route}) => {
  const dispatch = useDispatch();
  const {isLoading, error} = useSelector((state) => state.auth);
  
  const {confirmation, phone} = route.params || {};
  
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [role, setRole] = useState('');
  const [step, setStep] = useState('otp');
  const [resendTimer, setResendTimer] = useState(30);
  const [confirmationResult, setConfirmationResult] = useState(confirmation);

  useEffect(() => {
    dispatch(clearError());
    return () => {
      dispatch(clearError());
      dispatch(setLoading(false));
    };
  }, [dispatch]);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleVerifyOTP = async () => {
    if (!validateOTP(otp)) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }
    setOtpError('');
    dispatch(setLoading(true));

    try {
      const result = await verifyOTP(confirmationResult, otp);
      
      if (result.success) {
        const idToken = await getIdToken();
        
        if (!idToken) {
          Alert.alert('Error', 'Authentication failed. Please try again.');
          dispatch(setLoading(false));
          return;
        }

        // Try to verify with backend - it will auto-login existing users
        try {
          await dispatch(
            verifyWithBackend({
              idToken,
              role: null,
              name: null,
            }),
          ).unwrap();
          // If successful, user exists and is logged in
          // Navigation handled by AppNavigator
        } catch (backendError) {
          // User doesn't exist, show profile setup
          if (backendError === 'NEW_USER_REQUIRED' || 
              backendError === 'User not found' ||
              backendError?.includes?.('NEW_USER')) {
            setStep('profile');
          } else {
            Alert.alert('Error', backendError || 'Verification failed');
          }
        }
      } else {
        Alert.alert('Error', result.error || 'Invalid OTP');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Verification failed');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleCompleteProfile = async () => {
    if (!validateName(name)) {
      setNameError('Please enter a valid name (2-50 characters)');
      return;
    }
    if (!role) {
      Alert.alert('Select Role', 'Please select whether you are a Man or Woman');
      return;
    }
    setNameError('');
    dispatch(setLoading(true));

    try {
      const idToken = await getIdToken();
      
      if (!idToken) {
        Alert.alert('Error', 'Authentication failed. Please try again.');
        dispatch(setLoading(false));
        return;
      }

      await dispatch(
        verifyWithBackend({
          idToken,
          role,
          name: name.trim(),
        }),
      ).unwrap();
    } catch (err) {
      Alert.alert('Error', err.message || err || 'Registration failed');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    dispatch(setLoading(true));

    try {
      const result = await signInWithPhone(phone);
      if (result.success) {
        setConfirmationResult(result.confirmation);
        setResendTimer(30);
        Alert.alert('Success', 'OTP sent successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to resend OTP');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to resend OTP');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const renderOTPStep = () => (
    <>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to{'\n'}
        <Text style={styles.phoneText}>+91 {formatPhone(phone)}</Text>
      </Text>

      <Input
        label="OTP Code"
        value={otp}
        onChangeText={setOtp}
        placeholder="Enter 6-digit OTP"
        keyboardType="number-pad"
        maxLength={6}
        leftIcon="shield-key"
        error={otpError}
      />

      <Button
        title="Verify"
        onPress={handleVerifyOTP}
        loading={isLoading}
        fullWidth
        style={styles.button}
      />

      <View style={styles.resendContainer}>
        {resendTimer > 0 ? (
          <Text style={styles.resendText}>
            Resend OTP in <Text style={styles.timerText}>{resendTimer}s</Text>
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResendOTP}>
            <Text style={styles.resendButton}>Resend OTP</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const renderProfileStep = () => (
    <>
      <Text style={styles.title}>Complete Profile</Text>
      <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

      <Input
        label="Your Name"
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
        autoCapitalize="words"
        leftIcon="account"
        error={nameError}
      />

      <Text style={styles.roleLabel}>I am a</Text>
      <View style={styles.roleContainer}>
        <TouchableOpacity
          onPress={() => setRole('men')}
          style={styles.roleCardWrapper}>
          <Card
            variant={role === 'men' ? 'gradient' : 'default'}
            gradientColors={COLORS.gradientPrimary}
            style={[styles.roleCard, role === 'men' && styles.roleCardSelected]}>
            <Icon
              name="gender-male"
              size={32}
              color={role === 'men' ? COLORS.white : COLORS.primary}
            />
            <Text style={[styles.roleText, role === 'men' && styles.roleTextSelected]}>
              Man
            </Text>
            <Text style={[styles.roleDescription, role === 'men' && styles.roleDescriptionSelected]}>
              Browse & Call
            </Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setRole('women')}
          style={styles.roleCardWrapper}>
          <Card
            variant={role === 'women' ? 'gradient' : 'default'}
            gradientColors={COLORS.gradientSecondary}
            style={[styles.roleCard, role === 'women' && styles.roleCardSelected]}>
            <Icon
              name="gender-female"
              size={32}
              color={role === 'women' ? COLORS.white : COLORS.secondary}
            />
            <Text style={[styles.roleText, role === 'women' && styles.roleTextSelected]}>
              Woman
            </Text>
            <Text style={[styles.roleDescription, role === 'women' && styles.roleDescriptionSelected]}>
              Receive & Earn
            </Text>
          </Card>
        </TouchableOpacity>
      </View>

      <Button
        title="Continue"
        onPress={handleCompleteProfile}
        loading={isLoading}
        fullWidth
        icon="arrow-right"
        iconPosition="right"
        style={styles.button}
      />
    </>
  );

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
          <TouchableOpacity
            onPress={() => step === 'profile' ? setStep('otp') : navigation.goBack()}
            style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>


          <View style={styles.formContainer}>
            {step === 'otp' ? renderOTPStep() : renderProfileStep()}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: SPACING.lg },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  title: { fontSize: FONTS.xxl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.base, color: COLORS.textSecondary, marginBottom: SPACING.lg, lineHeight: 22 },
  phoneText: { color: COLORS.primary, fontWeight: '600' },
  button: { marginTop: SPACING.sm },
  resendContainer: { alignItems: 'center', marginTop: SPACING.lg },
  resendText: { fontSize: FONTS.base, color: COLORS.textSecondary },
  timerText: { color: COLORS.primary, fontWeight: '600' },
  resendButton: { fontSize: FONTS.base, color: COLORS.primary, fontWeight: '600' },
  roleLabel: { fontSize: FONTS.base, fontWeight: '500', color: COLORS.text, marginBottom: SPACING.md },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.lg },
  roleCardWrapper: { flex: 1, marginHorizontal: SPACING.xs },
  roleCard: { alignItems: 'center', paddingVertical: SPACING.lg },
  roleCardSelected: { borderWidth: 0 },
  roleText: { fontSize: FONTS.lg, fontWeight: '600', color: COLORS.text, marginTop: SPACING.sm },
  roleTextSelected: { color: COLORS.white },
  roleDescription: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginTop: 4 },
  roleDescriptionSelected: { color: COLORS.white, opacity: 0.8 },
  errorText: { color: COLORS.danger, fontSize: FONTS.sm, textAlign: 'center', marginTop: SPACING.md },
});

export default OTPVerifyScreen;
