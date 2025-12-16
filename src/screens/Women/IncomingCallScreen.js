import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  Alert,
  BackHandler,
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
  const ringAnim = useRef(new Animated.Value(0)).current;
  const [coinsEarned, setCoinsEarned] = useState(0);

  // Handle back button - prevent going back during call
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'connected') {
        Alert.alert(
          'End Call?',
          'Are you sure you want to end this call?',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'End Call', onPress: handleEndCall, style: 'destructive'},
          ]
        );
        return true;
      }
      if (status === 'ringing') {
        handleDecline();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [status]);

  // Vibration pattern for incoming call
  useEffect(() => {
    if (status === 'ringing') {
      // Vibration pattern: wait 0ms, vibrate 500ms, wait 200ms, vibrate 500ms
      const pattern = [0, 500, 200, 500, 200, 500];
      
      // Start vibration loop
      const vibrationInterval = setInterval(() => {
        Vibration.vibrate(pattern);
      }, 2000);

      // Pulse animation for avatar
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

      // Ring animation for call button
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      return () => {
        clearInterval(vibrationInterval);
        Vibration.cancel();
      };
    } else {
      Vibration.cancel();
      pulseAnim.setValue(1);
      ringAnim.setValue(0);
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
        timerRef.current = null;
      }
    };
  }, [status, dispatch]);

  // Calculate earnings every minute
  useEffect(() => {
    if (status === 'connected' && duration > 0 && duration % 60 === 0) {
      const earned = CALL_RATES.coinsPerMinute;
      setCoinsEarned((prev) => prev + earned);
      dispatch(updateCoins((user?.coins || 0) + earned));
    }
  }, [duration, status, dispatch, user?.coins]);

  // Handle call status changes
  useEffect(() => {
    if (status === 'ended') {
      Vibration.cancel();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Show summary and go back
      const timeout = setTimeout(() => {
        dispatch(resetCall());
        navigation.goBack();
      }, 2500);
      
      return () => clearTimeout(timeout);
    }
  }, [status, dispatch, navigation]);

  // Handle if call fails or is rejected
  useEffect(() => {
    if (status === 'idle' && !remoteUser) {
      // Call was reset, go back
      navigation.goBack();
    }
  }, [status, remoteUser, navigation]);

  const handleAnswer = () => {
    console.log('📞 Answering call:', callId);
    Vibration.cancel();
    
    // Send answer to server
    const success = socketService.answerCall(callId);
    
    if (success) {
      dispatch(callAnswered({callId}));
      
      // Simulate connection (server will confirm)
      setTimeout(() => {
        dispatch(callConnected());
      }, 1000);
    } else {
      Alert.alert('Error', 'Failed to answer call. Please try again.');
    }
  };

  const handleDecline = () => {
    console.log('📞 Declining call:', callId);
    Vibration.cancel();
    
    socketService.rejectCall(callId);
    dispatch(endCall({reason: 'declined'}));
  };

  const handleEndCall = () => {
    console.log('📞 Ending call:', callId);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    socketService.endCall(callId);
    dispatch(endCall({reason: 'user_ended', duration, coinsEarned}));
  };

  const handleToggleMute = () => {
    dispatch(toggleMute());
    // TODO: Actually mute microphone when WebRTC is implemented
  };

  const handleToggleSpeaker = () => {
    dispatch(toggleSpeaker());
    // TODO: Actually toggle speaker when WebRTC is implemented
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

  const answerButtonScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const renderRingingControls = () => (
    <View style={styles.ringingControls}>
      {/* Decline Button */}
      <TouchableOpacity onPress={handleDecline} activeOpacity={0.8}>
        <LinearGradient
          colors={COLORS.gradientDanger}
          style={styles.controlCircle}>
          <Icon name="phone-hangup" size={32} color={COLORS.white} />
        </LinearGradient>
        <Text style={styles.controlLabel}>Decline</Text>
      </TouchableOpacity>

      {/* Answer Button */}
      <Animated.View style={{transform: [{scale: answerButtonScale}]}}>
        <TouchableOpacity onPress={handleAnswer} activeOpacity={0.8}>
          <LinearGradient
            colors={COLORS.gradientSecondary}
            style={styles.controlCircle}>
            <Icon name="phone" size={32} color={COLORS.white} />
          </LinearGradient>
          <Text style={styles.controlLabel}>Answer</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderConnectedControls = () => (
    <View style={styles.connectedControls}>
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
          <Text style={[styles.smallLabel, isMuted && styles.smallLabelActive]}>
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
          <Text style={[styles.smallLabel, isSpeakerOn && styles.smallLabelActive]}>
            Speaker
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleEndCall} activeOpacity={0.8}>
        <LinearGradient
          colors={COLORS.gradientDanger}
          style={styles.endCallButton}>
          <Icon name="phone-hangup" size={32} color={COLORS.white} />
        </LinearGradient>
        <Text style={styles.endCallLabel}>End Call</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEndedSummary = () => (
    <View style={styles.endedSummary}>
      <Icon name="check-circle" size={48} color={COLORS.success} />
      <Text style={styles.endedTitle}>Call Ended</Text>
      <Text style={styles.endedDuration}>Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</Text>
      {coinsEarned > 0 && (
        <View style={styles.earningsRow}>
          <Icon name="circle-multiple" size={20} color={COLORS.accent} />
          <Text style={styles.earnedText}>+{formatNumber(coinsEarned)} coins earned</Text>
        </View>
      )}
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
          {status === 'ended' ? (
            renderEndedSummary()
          ) : (
            <>
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
              <Text style={styles.userName}>{remoteUser?.name || 'Unknown Caller'}</Text>
              <Text style={styles.statusText}>{getStatusText()}</Text>

              {/* Timer */}
              {(status === 'connected') && (
                <View style={styles.timerContainer}>
                  <CallTimer duration={duration} isActive={status === 'connected'} />
                  <Text style={styles.rateText}>
                    Earning {CALL_RATES.coinsPerMinute} coins/min
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Controls */}
        {status === 'ringing' && renderRingingControls()}
        {(status === 'connected' || status === 'connecting') && renderConnectedControls()}
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
    textAlign: 'center',
  },
  statusText: {
    fontSize: FONTS.lg,
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
  controlLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
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
  smallLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  smallLabelActive: {
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
  endedSummary: {
    alignItems: 'center',
  },
  endedTitle: {
    fontSize: FONTS.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  endedDuration: {
    fontSize: FONTS.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  earnedText: {
    fontSize: FONTS.base,
    color: COLORS.accent,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
});

export default IncomingCallScreen;