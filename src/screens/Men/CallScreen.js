import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  BackHandler,
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
  const {status, duration, isMuted, isSpeakerOn, remoteUser, callId, endReason, error} = useSelector(
    (state) => state.call,
  );

  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [localCoinsUsed, setLocalCoinsUsed] = useState(0);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'connected') {
        Alert.alert(
          'End Call?',
          'Are you sure you want to end this call?',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'End Call', onPress: () => handleEndCall(), style: 'destructive'},
          ]
        );
        return true;
      }
      if (status === 'calling' || status === 'connecting') {
        handleEndCall('cancelled');
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [status]);

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
  }, [status, pulseAnim]);

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
        timerRef.current = null;
      }
    };
  }, [status, dispatch]);

  // Check coins and deduct every minute
  useEffect(() => {
    if (status === 'connected' && duration > 0 && duration % 60 === 0) {
      const coinsToDeduct = CALL_RATES.coinsPerMinute;
      const currentCoins = user?.coins || 0;

      if (currentCoins < coinsToDeduct) {
        handleEndCall('insufficient_coins');
        return;
      }

      // Deduct coins
      dispatch(updateCoins(currentCoins - coinsToDeduct));
      setLocalCoinsUsed(prev => prev + coinsToDeduct);
    }
  }, [duration, status, user?.coins, dispatch]);

  // Handle call status changes - show alerts for failures
  useEffect(() => {
    if (status === 'ended') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Show appropriate message based on end reason
      let message = 'Call ended';
      let title = 'Call Ended';

      switch (endReason) {
        case 'insufficient_coins':
          title = 'Low Balance';
          message = 'Your coin balance is too low to continue the call.';
          break;
        case 'busy':
          title = 'User Busy';
          message = 'This user is currently on another call. Please try again later.';
          break;
        case 'rejected':
          title = 'Call Declined';
          message = 'The user declined your call.';
          break;
        case 'no_answer':
          title = 'No Answer';
          message = 'The user did not answer.';
          break;
        case 'failed':
          title = 'Call Failed';
          message = error || 'Unable to connect. Please try again.';
          break;
        case 'disconnected':
          title = 'Disconnected';
          message = 'The other user disconnected.';
          break;
        case 'user_ended':
        case 'remote_ended':
          // Normal end, just go back
          break;
      }

      // Show alert for error cases, then go back
      if (['busy', 'rejected', 'no_answer', 'failed', 'insufficient_coins'].includes(endReason)) {
        Alert.alert(title, message, [
          {
            text: 'OK',
            onPress: () => {
              dispatch(resetCall());
              navigation.goBack();
            },
          },
        ]);
      } else {
        // Normal end - wait a moment then go back
        const timeout = setTimeout(() => {
          dispatch(resetCall());
          navigation.goBack();
        }, 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [status, endReason, error, dispatch, navigation]);

  const handleEndCall = (reason = 'user_ended') => {
    console.log('📞 Ending call, reason:', reason);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    socketService.endCall(callId);
    dispatch(endCall({reason, duration, coinsUsed: localCoinsUsed}));
  };

  const handleToggleMute = () => {
    dispatch(toggleMute());
    // TODO: Actually mute microphone when WebRTC is implemented
  };

  const handleToggleSpeaker = () => {
    dispatch(toggleSpeaker());
    // TODO: Actually toggle speaker when WebRTC is implemented
  };

  const callUser = woman || remoteUser;
  const coinsUsed = calculateCoinsUsed(duration);
  const remainingCoins = Math.max(0, (user?.coins || 0));

  const getStatusText = () => {
    switch (status) {
      case 'calling':
        return 'Calling...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Connected';
      case 'ended':
        switch (endReason) {
          case 'busy':
            return 'User Busy';
          case 'rejected':
            return 'Call Declined';
          case 'no_answer':
            return 'No Answer';
          case 'failed':
            return 'Call Failed';
          default:
            return 'Call Ended';
        }
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'calling':
        return 'phone-outgoing';
      case 'connecting':
        return 'phone-sync';
      case 'connected':
        return 'phone-in-talk';
      case 'ended':
        return endReason === 'busy' ? 'phone-off' : 'phone-hangup';
      default:
        return 'phone';
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
              {status === 'ended' && endReason === 'busy' && (
                <View style={[styles.connectedBadge, {backgroundColor: COLORS.warning}]}>
                  <Icon name="phone-off" size={20} color={COLORS.white} />
                </View>
              )}
            </View>
          </Animated.View>

          {/* Name & Status */}
          <Text style={styles.userName}>{callUser?.name || 'Unknown'}</Text>
          <View style={styles.statusRow}>
            <Icon 
              name={getStatusIcon()} 
              size={18} 
              color={status === 'ended' && endReason !== 'user_ended' ? COLORS.warning : COLORS.textSecondary} 
            />
            <Text style={[
              styles.statusText,
              status === 'ended' && endReason !== 'user_ended' && styles.statusTextWarning
            ]}>
              {getStatusText()}
            </Text>
          </View>

          {/* Timer */}
          {(status === 'connected' || (status === 'ended' && duration > 0)) && (
            <View style={styles.timerContainer}>
              <CallTimer duration={duration} isActive={status === 'connected'} />
              {status === 'connected' && (
                <Text style={styles.coinsUsed}>
                  {coinsUsed} coins used
                </Text>
              )}
            </View>
          )}

          {/* Error Message */}
          {status === 'ended' && error && (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={20} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {status === 'connected' && (
            <View style={styles.controlsRow}>
              <TouchableOpacity
                onPress={handleToggleMute}
                style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                activeOpacity={0.7}>
                <Icon
                  name={isMuted ? 'microphone-off' : 'microphone'}
                  size={28}
                  color={isMuted ? COLORS.white : COLORS.text}
                />
                <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleSpeaker}
                style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                activeOpacity={0.7}>
                <Icon
                  name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
                  size={28}
                  color={isSpeakerOn ? COLORS.white : COLORS.text}
                />
                <Text style={[styles.controlLabel, isSpeakerOn && styles.controlLabelActive]}>
                  Speaker
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* End/Cancel Call Button */}
          {status !== 'ended' && (
            <TouchableOpacity onPress={() => handleEndCall()} activeOpacity={0.8}>
              <LinearGradient
                colors={COLORS.gradientDanger}
                style={styles.endCallButton}>
                <Icon name="phone-hangup" size={32} color={COLORS.white} />
              </LinearGradient>
              <Text style={styles.endCallLabel}>
                {status === 'calling' ? 'Cancel' : 'End Call'}
              </Text>
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  statusTextWarning: {
    color: COLORS.warning,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  errorText: {
    fontSize: FONTS.sm,
    color: COLORS.danger,
    marginLeft: SPACING.xs,
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
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
  },
  controlButtonActive: {
    backgroundColor: COLORS.primary,
  },
  controlLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  controlLabelActive: {
    color: COLORS.white,
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallLabel: {
    fontSize: FONTS.sm,
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});

export default CallScreen;