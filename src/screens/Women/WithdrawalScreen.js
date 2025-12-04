import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { selectUserProfile } from '../../redux/slices/userSlice';
import { withdrawalAPI } from '../../services/api/withdrawalAPI';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { validators } from '../../utils/validators';
import { calculateEarnings } from '../../utils/helpers';
import { theme } from '../../config/theme';
import Toast from 'react-native-toast-message';

const WithdrawalScreen = ({ navigation }) => {
  const profile = useAppSelector(selectUserProfile);
  const [upiId, setUpiId] = useState(profile?.upiId || '');
  const [upiError, setUpiError] = useState('');
  const [loading, setLoading] = useState(false);

  const earnings = calculateEarnings(profile?.coins || 0);
  const canWithdraw = (profile?.coins || 0) >= 1000;

  const handleWithdrawal = async () => {
    setUpiError('');

    const error = validators.upiId(upiId);
    if (error) {
      setUpiError(error);
      return;
    }

    if (!canWithdraw) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Coins',
        text2: 'Minimum 1000 coins required',
      });
      return;
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Request withdrawal of ₹${earnings} for ${profile.coins} coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              await withdrawalAPI.requestWithdrawal(upiId);
              Alert.alert(
                'Success',
                'Withdrawal requested successfully. Will be processed on Sunday.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || 'Failed to request withdrawal',
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.label}>Withdrawal Amount</Text>
        <Text style={styles.value}>₹{earnings}</Text>
        <Text style={styles.sublabel}>
          {profile?.coins || 0} coins = ₹{earnings}
        </Text>
      </Card>

      <View style={styles.form}>
        <Input
          label="UPI ID"
          value={upiId}
          onChangeText={(text) => {
            setUpiId(text);
            setUpiError('');
          }}
          placeholder="yourname@upi"
          keyboardType="email-address"
          autoCapitalize="none"
          error={upiError}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>ℹ️ Important Information</Text>
          <Text style={styles.infoSubtext}>
            • Minimum 1000 coins required{'\n'}
            • Payouts processed every Sunday{'\n'}
            • Money will be sent to your UPI ID{'\n'}
            • Processing time: 1-2 business days
          </Text>
        </View>

        <Button
          title="Request Withdrawal"
          onPress={handleWithdrawal}
          loading={loading}
          disabled={!canWithdraw}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  card: {
    margin: theme.spacing.md,
  },
  label: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textLight,
  },
  value: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.secondary,
    marginVertical: theme.spacing.sm,
  },
  sublabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  form: {
    padding: theme.spacing.md,
  },
  infoBox: {
    backgroundColor: `${theme.colors.info}10`,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  infoText: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  infoSubtext: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textLight,
    lineHeight: 20,
  },
});

export default WithdrawalScreen;