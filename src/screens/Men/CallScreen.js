import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS, FONTS, SPACING, RADIUS, CALL_RATES} from '../../config/constants';
import {
  callConnected,
  incrementDuration,
  toggleMute,
  toggleSpeaker,
  endCall,
  resetCall,
} from '../../redux/slices/callSlice';
import {updateCoins} from '../../redux/slices/authSlice';
import socketService from '../../services/socketService';
import Avatar from '../../components/common/Avatar';
import CallTimer from '../../components/CallTimer';
import CoinDisplay from '../../components/CoinDisplay';
import {formatDuration, calculateCoinsUsed} from '../../utils/helpers';

const CallScreen = ({navigation, route}) => {
  const dispatch = useDispatch();
  const {woman} = route.params || {};
  const {user} = useSelector((state) => state.auth);
  const {status, duration, isMuted, isSpeakerOn, remoteUser, callId} = useSelector(
    (state) => state.call,
  );

  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for calling state
  useEffect(() => {
    if (status === 'calling' || status === 'connecting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  // Simulate call connected after 3 seconds (for demo)
  useEffect(() => {
    if (status === 'calling') {
      const timeout = setTimeout(() => {
        dispatch(callConnected());
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  // Timer for connected call
  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => {
        dispatch(incrementDuration());
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status]);

  // Check coins and deduct
  useEffect(() => {
    if (status === 'connected' && duration > 0 && duration % 60 === 0) {
      const coinsToDeduct = CALL_RATES.coinsPerMinute;
      const currentCoins = user?.coins || 0;

      if (currentCoins < coinsToDeduct) {
        handleEndCall('insufficient_coins');
        return;
      }

      dispatch(updateCoins(currentCoins - coinsToDeduct));
    }
  }, [duration, status]);

  // Handle call status changes
  useEffect(() => {
    if (status === 'ended') {
      const timeout = setTimeout(() => {
        dispatch(resetCall());
        navigation.goBack();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  const handleEndCall = (reason = 'user_ended') => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    socketService.endCall(callId);
    dispatch(endCall({reason, duration}));

    if (reason === 'insufficient_coins') {
      Alert.alert(
        'Call Ended',
        'Your coin balance is too low to continue the call.',
        [{text: 'OK'}],
      );
    }
  };

  const handleToggleMute = () => {
    dispatch(toggleMute());
  };

  const handleToggleSpeaker = () => {
    dispatch(toggleSpeaker());
  };

  const callUser = woman || remoteUser;
  const coinsUsed = calculateCoinsUsed(duration);
  const remainingCoins = (user?.coins || 0) - coinsUsed;

  const getStatusText = () => {
    switch (status) {
      case 'calling':
        return 'Calling...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Connected';
      case 'ended':
        return 'Call Ended';
      default:
        return '';
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <CoinDisplay coins={remainingCoins} showAddButton={false} size="small" />
          <View style={styles.rateInfo}>
            <Icon name="clock-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.rateText}>{CALL_RATES.coinsPerMinute}/min</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Avatar */}
          <Animated.View style={{transform: [{scale: pulseAnim}]}}>
            <View style={styles.avatarContainer}>
              <Avatar
                name={callUser?.name}
                imageUrl={callUser?.profileImage}
                size={140}
              />
              {status === 'connected' && (
                <View style={styles.connectedBadge}>
                  <Icon name="phone-in-talk" size={20} color={COLORS.white} />
                </View>
              )}
            </View>
          </Animated.View>

          {/* Name & Status */}
          <Text style={styles.userName}>{callUser?.name || 'Unknown'}</Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>

          {/* Timer */}
          {(status === 'connected' || status === 'ended') && (
            <View style={styles.timerContainer}>
              <CallTimer duration={duration} isActive={status === 'connected'} />
              {status === 'connected' && (
                <Text style={styles.coinsUsed}>
                  {coinsUsed} coins used
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {status === 'connected' && (
            <View style={styles.controlsRow}>
              <TouchableOpacity
                onPress={handleToggleMute}
                style={[styles.controlButton, isMuted && styles.controlButtonActive]}>
                <Icon
                  name={isMuted ? 'microphone-off' : 'microphone'}
                  size={28}
                  color={isMuted ? COLORS.white : COLORS.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleSpeaker}
                style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}>
                <Icon
                  name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
                  size={28}
                  color={isSpeakerOn ? COLORS.white : COLORS.text}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* End Call Button */}
          {status !== 'ended' && (
            <TouchableOpacity onPress={() => handleEndCall()}>
              <LinearGradient
                colors={COLORS.gradientDanger}
                style={styles.endCallButton}>
                <Icon name="phone-hangup" size={32} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  rateText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  connectedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  userName: {
    fontSize: FONTS.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statusText: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  coinsUsed: {
    fontSize: FONTS.sm,
    color: COLORS.accent,
    marginTop: SPACING.xs,
  },
  controls: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
  },
  controlButtonActive: {
    backgroundColor: COLORS.primary,
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CallScreen;
