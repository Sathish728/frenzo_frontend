import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
  AppState,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS, FONTS, SPACING, RADIUS, CALL_RATES, WITHDRAWAL} from '../../config/constants';
import {logout} from '../../redux/slices/authSlice';
import {setAvailabilityStatus} from '../../redux/slices/userSlice';
import {resetCall} from '../../redux/slices/callSlice';
import {userAPI} from '../../services/api/userAPI';
import socketService from '../../services/socketService';
import Avatar from '../../components/common/Avatar';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {formatNumber} from '../../utils/helpers';

const WomenDashboardScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {user, token} = useSelector((state) => state.auth);
  const {isAvailable} = useSelector((state) => state.user);
  const callState = useSelector((state) => state.call);

  const [localIsAvailable, setLocalIsAvailable] = useState(isAvailable || false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const appState = useRef(AppState.currentState);

  // Connect socket on mount
  useEffect(() => {
    if (token) {
      console.log('Connecting socket with token...');
      socketService.connect(token);
    }

    return () => {
      // Don't disconnect on unmount - keep socket alive
    };
  }, [token]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground - reconnect if needed
        if (token && !socketService.isSocketConnected()) {
          console.log('App foregrounded - reconnecting socket...');
          socketService.connect(token);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [token]);

  // Sync local state with redux
  useEffect(() => {
    setLocalIsAvailable(isAvailable);
  }, [isAvailable]);

  // *** CRITICAL: Listen for incoming calls and navigate ***
  useEffect(() => {
    console.log('Call state changed:', callState.status, callState.remoteUser?.name);
    
    if (callState.status === 'ringing' && callState.remoteUser) {
      console.log('Navigating to IncomingCall screen...');
      navigation.navigate('IncomingCall');
    }
  }, [callState.status, callState.remoteUser, navigation]);

  const handleToggleAvailability = async (value) => {
    // Update UI immediately for better UX
    setLocalIsAvailable(value);
    setIsTogglingAvailability(true);

    try {
      // Call API
      await userAPI.toggleAvailability(value);
      
      // Update Redux state
      dispatch(setAvailabilityStatus(value));
      
      // Update socket
      socketService.setAvailability(value);
      
      console.log('Availability toggled:', value);
    } catch (err) {
      console.error('Toggle availability error:', err);
      // Revert UI on error
      setLocalIsAvailable(!value);
      Alert.alert(
        'Error', 
        err.response?.data?.message || 'Failed to update availability. Please check your internet connection.'
      );
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  const handleWithdraw = () => {
    if ((user?.coins || 0) < WITHDRAWAL.minimumCoins) {
      Alert.alert(
        'Minimum Balance Required',
        `You need at least ${WITHDRAWAL.minimumCoins} coins to request a withdrawal.\n\nYou currently have ${user?.coins || 0} coins.`,
      );
      return;
    }
    navigation.navigate('Withdrawal');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          socketService.disconnect();
          dispatch(logout());
        },
      },
    ]);
  };

  const coins = user?.coins || 0;
  const earnings = (coins / 1000) * CALL_RATES.earningsPerThousandCoins;
  const canWithdraw = coins >= WITHDRAWAL.minimumCoins;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Icon name="logout" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Avatar
            name={user?.name}
            imageUrl={user?.profileImage}
            size={80}
            showOnlineStatus
            isOnline={localIsAvailable}
          />
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                {backgroundColor: localIsAvailable ? COLORS.success : COLORS.textMuted},
              ]}
            />
            <Text style={styles.statusText}>
              {localIsAvailable ? 'Online - Receiving Calls' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Availability Toggle */}
        <Card style={styles.availabilityCard}>
          <View style={styles.availabilityRow}>
            <View style={styles.availabilityInfo}>
              <Text style={styles.availabilityLabel}>Available for Calls</Text>
              <Text style={styles.availabilityHint}>
                {localIsAvailable 
                  ? 'You will receive calls from men' 
                  : 'Turn on to start receiving calls'}
              </Text>
            </View>
            <Switch
              value={localIsAvailable}
              onValueChange={handleToggleAvailability}
              disabled={isTogglingAvailability}
              trackColor={{false: COLORS.surfaceLight, true: COLORS.primaryLight}}
              thumbColor={localIsAvailable ? COLORS.primary : COLORS.textMuted}
            />
          </View>
          {localIsAvailable && (
            <View style={styles.waitingInfo}>
              <Icon name="phone-ring" size={16} color={COLORS.success} />
              <Text style={styles.waitingText}>Waiting for calls...</Text>
            </View>
          )}
        </Card>

        {/* Earnings Card */}
        <LinearGradient
          colors={COLORS.gradientSecondary}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsLabel}>Your Earnings</Text>
            <Icon name="wallet" size={24} color={COLORS.white} />
          </View>
          <View style={styles.earningsRow}>
            <View style={styles.earningsItem}>
              <Icon name="circle-multiple" size={24} color={COLORS.white} />
              <Text style={styles.earningsValue}>{formatNumber(coins)}</Text>
              <Text style={styles.earningsSubtext}>Coins</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsItem}>
              <Icon name="currency-inr" size={24} color={COLORS.white} />
              <Text style={styles.earningsValue}>{earnings.toFixed(0)}</Text>
              <Text style={styles.earningsSubtext}>Rupees</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Icon name="clock-outline" size={24} color={COLORS.accent} />
            <Text style={styles.statValue}>{CALL_RATES.coinsPerMinute}</Text>
            <Text style={styles.statLabel}>Coins/min</Text>
          </Card>
          <Card style={styles.statCard}>
            <Icon name="cash" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>₹{CALL_RATES.earningsPerThousandCoins}</Text>
            <Text style={styles.statLabel}>per 1000 coins</Text>
          </Card>
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="information" size={20} color={COLORS.primary} />
            <Text style={styles.infoTitle}>How it works</Text>
          </View>
          <Text style={styles.infoText}>
            • Turn on availability to receive calls{'\n'}
            • Earn {CALL_RATES.coinsPerMinute} coins for every minute of call{'\n'}
            • 1000 coins = ₹{CALL_RATES.earningsPerThousandCoins}{'\n'}
            • Minimum withdrawal: {WITHDRAWAL.minimumCoins} coins{'\n'}
            • Payouts every {WITHDRAWAL.payoutDay}
          </Text>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={canWithdraw ? 'Withdraw Earnings' : `Need ${WITHDRAWAL.minimumCoins - coins} more coins`}
            onPress={handleWithdraw}
            variant={canWithdraw ? 'primary' : 'outline'}
            icon="bank-transfer"
            fullWidth
            disabled={!canWithdraw}
            style={styles.withdrawButton}
          />
          <Button
            title="View Earnings History"
            onPress={() => navigation.navigate('Earnings')}
            variant="ghost"
            icon="history"
            fullWidth
          />
        </View>

        {/* Socket Status (Debug) */}
        {__DEV__ && (
          <Card style={styles.debugCard}>
            <Text style={styles.debugTitle}>Debug Info</Text>
            <Text style={styles.debugText}>
              Socket: {socketService.isSocketConnected() ? '✅ Connected' : '❌ Disconnected'}{'\n'}
              Call Status: {callState.status}{'\n'}
              User ID: {user?.id || user?._id || 'N/A'}
            </Text>
            <TouchableOpacity 
              onPress={() => socketService.reconnect()}
              style={styles.reconnectBtn}>
              <Text style={styles.reconnectText}>Reconnect Socket</Text>
            </TouchableOpacity>
          </Card>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONTS.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  logoutButton: {
    padding: SPACING.xs,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  userName: {
    fontSize: FONTS.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  statusText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  availabilityCard: {
    marginBottom: SPACING.md,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  availabilityLabel: {
    fontSize: FONTS.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  availabilityHint: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  waitingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  waitingText: {
    fontSize: FONTS.sm,
    color: COLORS.success,
    marginLeft: SPACING.xs,
  },
  earningsCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  earningsLabel: {
    fontSize: FONTS.base,
    color: COLORS.white,
    opacity: 0.8,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningsValue: {
    fontSize: FONTS.xxxl,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  earningsSubtext: {
    fontSize: FONTS.sm,
    color: COLORS.white,
    opacity: 0.8,
  },
  earningsDivider: {
    width: 1,
    height: 60,
    backgroundColor: COLORS.white,
    opacity: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  statValue: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoCard: {
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoTitle: {
    fontSize: FONTS.base,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  infoText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  actions: {
    marginBottom: SPACING.lg,
  },
  withdrawButton: {
    marginBottom: SPACING.sm,
  },
  debugCard: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
  },
  debugTitle: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: SPACING.xs,
  },
  debugText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  reconnectBtn: {
    marginTop: SPACING.sm,
    padding: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  reconnectText: {
    fontSize: FONTS.xs,
    color: COLORS.white,
  },
});

export default WomenDashboardScreen;