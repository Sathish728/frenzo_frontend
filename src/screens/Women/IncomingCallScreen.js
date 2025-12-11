import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS, FONTS, SPACING, RADIUS, CALL_RATES} from '../../config/constants';
import {
  callAnswered,
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
import {formatNumber} from '../../utils/helpers';

const IncomingCallScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {user} = useSelector((state) => state.auth);
  const {status, duration, remoteUser, callId, isMuted, isSpeakerOn} = useSelector(
    (state) => state.call,
  );

  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [coinsEarned, setCoinsEarned] = useState(0);

  // Vibration pattern for incoming call
  useEffect(() => {
    if (status === 'ringing') {
      const pattern = [0, 500, 200, 500];
      Vibration.vibrate(pattern, true);

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }

    return () => {
      Vibration.cancel();
    };
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

  // Calculate earnings every minute
  useEffect(() => {
    if (status === 'connected' && duration > 0 && duration % 60 === 0) {
      const earned = CALL_RATES.coinsPerMinute;
      setCoinsEarned((prev) => prev + earned);
      dispatch(updateCoins((user?.coins || 0) + earned));
    }
  }, [duration, status]);

  // Handle call status changes
  useEffect(() => {
    if (status === 'ended') {
      Vibration.cancel();
      const timeout = setTimeout(() => {
        dispatch(resetCall());
        navigation.goBack();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  const handleAnswer = () => {
    Vibration.cancel();
    dispatch(callAnswered({callId}));
    socketService.answerCall(callId);
    
    // Simulate connection after 1 second
    setTimeout(() => {
      dispatch(callConnected());
    }, 1000);
  };

  const handleDecline = () => {
    Vibration.cancel();
    socketService.rejectCall(callId);
    dispatch(endCall({reason: 'declined'}));
  };

  const handleEndCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    socketService.endCall(callId);
    dispatch(endCall({reason: 'user_ended', duration, coinsEarned}));
  };

  const handleToggleMute = () => {
    dispatch(toggleMute());
  };

  const handleToggleSpeaker = () => {
    dispatch(toggleSpeaker());
  };

  const getStatusText = () => {
    switch (status) {
      case 'ringing':
        return 'Incoming Call';
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

  const renderRingingControls = () => (
    <View style={styles.ringingControls}>
      <TouchableOpacity onPress={handleDecline}>
        <LinearGradient
          colors={COLORS.gradientDanger}
          style={styles.controlCircle}>
          <Icon name="phone-hangup" size={32} color={COLORS.white} />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleAnswer}>
        <LinearGradient
          colors={COLORS.gradientSecondary}
          style={styles.controlCircle}>
          <Icon name="phone" size={32} color={COLORS.white} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderConnectedControls = () => (
    <View style={styles.connectedControls}>
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

      <TouchableOpacity onPress={handleEndCall}>
        <LinearGradient
          colors={COLORS.gradientDanger}
          style={styles.endCallButton}>
          <Icon name="phone-hangup" size={32} color={COLORS.white} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.surface]}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Earnings Badge (for connected calls) */}
        {status === 'connected' && (
          <View style={styles.earningsBadge}>
            <Icon name="circle-multiple" size={16} color={COLORS.accent} />
            <Text style={styles.earningsText}>
              +{formatNumber(coinsEarned)} earned
            </Text>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.content}>
          {/* Avatar */}
          <Animated.View style={{transform: [{scale: pulseAnim}]}}>
            <View style={styles.avatarContainer}>
              <Avatar
                name={remoteUser?.name}
                imageUrl={remoteUser?.profileImage}
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
          <Text style={styles.userName}>{remoteUser?.name || 'Unknown'}</Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>

          {/* Timer */}
          {(status === 'connected' || status === 'ended') && (
            <View style={styles.timerContainer}>
              <CallTimer duration={duration} isActive={status === 'connected'} />
              <Text style={styles.rateText}>
                Earning {CALL_RATES.coinsPerMinute} coins/min
              </Text>
            </View>
          )}
        </View>

        {/* Controls */}
        {status === 'ringing' && renderRingingControls()}
        {(status === 'connected' || status === 'connecting') &&
          renderConnectedControls()}
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
  earningsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    marginTop: SPACING.md,
  },
  earningsText: {
    fontSize: FONTS.sm,
    color: COLORS.accent,
    fontWeight: '600',
    marginLeft: SPACING.xs,
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
  rateText: {
    fontSize: FONTS.sm,
    color: COLORS.success,
    marginTop: SPACING.xs,
  },
  ringingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  controlCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectedControls: {
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

export default IncomingCallScreen;
