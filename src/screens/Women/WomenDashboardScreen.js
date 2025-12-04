import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchProfile, toggleAvailability } from '../../redux/thunks/userThunks';
import { selectUserProfile } from '../../redux/slices/userSlice';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { logoutUser } from '../../redux/thunks/authThunks';
import Card from '../../components/common/Card';
import socketService from '../../services/socket.service';
import { calculateEarnings } from '../../utils/helpers';
import { theme } from '../../config/theme';

const WomenDashboardScreen = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectUserProfile);
  const user = useAppSelector(selectCurrentUser);
  const [isAvailable, setIsAvailable] = useState(profile?.isAvailable || true);

  useEffect(() => {
    dispatch(fetchProfile());
    if (user?.id) {
      socketService.connect(user.id);
    }

    setupSocketListeners();
  }, []);

  useEffect(() => {
    if (profile) {
      setIsAvailable(profile.isAvailable);
    }
  }, [profile]);

  const setupSocketListeners = () => {
    socketService.socket?.on('incoming_call', ({ menUserId, menName, offer }) => {
      navigation.navigate('IncomingCall', { menUserId, menName, offer });
    });
  };

  const handleToggleAvailability = async (value) => {
    setIsAvailable(value);
    await dispatch(toggleAvailability(value));
  };

  const earnings = calculateEarnings(profile?.coins || 0);
  const canWithdraw = (profile?.coins || 0) >= 1000;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => dispatch(logoutUser())}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Availability</Text>
            <Text style={styles.sublabel}>
              {isAvailable ? 'You are online' : 'You are offline'}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleToggleAvailability}
            trackColor={{ false: '#ccc', true: theme.colors.secondary }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Total Coins</Text>
        <Text style={styles.value}>💰 {profile?.coins || 0}</Text>
        <Text style={styles.sublabel}>
          Each call earns you 40 coins per minute
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Estimated Earnings</Text>
        <Text style={styles.value}>₹{earnings}</Text>
        <Text style={styles.sublabel}>
          1000 coins = ₹50 | Weekly payout on Sunday
        </Text>
      </Card>

      <TouchableOpacity
        style={[
          styles.withdrawButton,
          !canWithdraw && styles.withdrawButtonDisabled,
        ]}
        onPress={() => navigation.navigate('Withdrawal')}
        disabled={!canWithdraw}
      >
        <Text style={styles.withdrawButtonText}>
          {canWithdraw
            ? 'Request Withdrawal'
            : `Need ${1000 - (profile?.coins || 0)} more coins`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.earningsButton}
        onPress={() => navigation.navigate('Earnings')}
      >
        <Text style={styles.earningsButtonText}>View Earnings History →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.md,
  },
  logoutButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  logoutText: {
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  card: {
    margin: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },
  sublabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  value: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginVertical: theme.spacing.sm,
  },
  withdrawButton: {
    backgroundColor: theme.colors.secondary,
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  withdrawButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  withdrawButtonText: {
    color: theme.colors.white,
    fontSize: theme.fonts.sizes.lg,
    fontWeight: 'bold',
  },
  earningsButton: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  earningsButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fonts.sizes.md,
    fontWeight: '600',
  },
});

export default WomenDashboardScreen;