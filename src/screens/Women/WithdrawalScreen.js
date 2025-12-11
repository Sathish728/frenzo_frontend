import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS, FONTS, SPACING, RADIUS, WITHDRAWAL} from '../../config/constants';
import {updateCoins} from '../../redux/slices/authSlice';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import {calculateEarnings, validateUPI, formatNumber} from '../../utils/helpers';

const WithdrawalScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {user} = useSelector((state) => state.auth);
  
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const coins = user?.coins || 0;
  const earnings = calculateEarnings(coins);
  const canWithdraw = coins >= WITHDRAWAL.minimumCoins;

  const handleWithdraw = async () => {
    if (!validateUPI(upiId)) {
      setUpiError('Please enter a valid UPI ID (e.g., name@upi)');
      return;
    }
    setUpiError('');

    if (!canWithdraw) {
      Alert.alert(
        'Insufficient Balance',
        `You need at least ${WITHDRAWAL.minimumCoins} coins to withdraw.`,
      );
      return;
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Withdraw ₹${earnings.toFixed(0)} to ${upiId}?\n\nThis will use all ${formatNumber(coins)} coins.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Confirm',
          onPress: async () => {
            setIsProcessing(true);

            try {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              dispatch(updateCoins(0));
              
              Alert.alert(
                'Request Submitted',
                `Your withdrawal request for ₹${earnings.toFixed(0)} has been submitted. Payment will be processed on ${WITHDRAWAL.payoutDay}.`,
                [{text: 'OK', onPress: () => navigation.goBack()}],
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to process withdrawal. Please try again.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={COLORS.gradientSecondary}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.amountCard}>
          <Text style={styles.amountLabel}>Available for Withdrawal</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Text style={styles.amountValue}>{earnings.toFixed(0)}</Text>
          </View>
          <Text style={styles.coinsText}>{formatNumber(coins)} coins</Text>
        </LinearGradient>

        <Card style={styles.inputCard}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <Input
            label="UPI ID"
            value={upiId}
            onChangeText={setUpiId}
            placeholder="yourname@upi"
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon="bank"
            error={upiError}
          />
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="information" size={20} color={COLORS.primary} />
            <Text style={styles.infoTitle}>Important Information</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="check-circle" size={16} color={COLORS.success} />
            <Text style={styles.infoText}>Minimum withdrawal: {WITHDRAWAL.minimumCoins} coins</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="check-circle" size={16} color={COLORS.success} />
            <Text style={styles.infoText}>Payouts processed every {WITHDRAWAL.payoutDay}</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="check-circle" size={16} color={COLORS.success} />
            <Text style={styles.infoText}>Payment via UPI only</Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="alert-circle" size={16} color={COLORS.warning} />
            <Text style={styles.infoText}>Ensure UPI ID is correct. Wrong ID may delay payment.</Text>
          </View>
        </Card>

        <Button
          title={`Withdraw ₹${earnings.toFixed(0)}`}
          onPress={handleWithdraw}
          loading={isProcessing}
          disabled={!canWithdraw || !upiId}
          fullWidth
          icon="bank-transfer-out"
          style={styles.withdrawButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  amountCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  amountLabel: {
    fontSize: FONTS.sm,
    color: COLORS.white,
    opacity: 0.8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.xs,
  },
  currencySymbol: {
    fontSize: FONTS.xxl,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 8,
  },
  amountValue: {
    fontSize: FONTS.display,
    fontWeight: '700',
    color: COLORS.white,
  },
  coinsText: {
    fontSize: FONTS.base,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 4,
  },
  inputCard: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoCard: {
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  infoTitle: {
    fontSize: FONTS.base,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  withdrawButton: {
    marginBottom: SPACING.lg,
  },
});

export default WithdrawalScreen;
