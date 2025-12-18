import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  BackHandler,
  Alert,
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
import webRTCService from '../../services/webrtcService';
import {requestCallPermissions} from '../../utils/permissions';
import Avatar from '../../components/common/Avatar';
import {formatNumber} from '../../utils/helpers';

const IncomingCallScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const {user} = useSelector((state) => state.auth);
  const {status, duration, remoteUser, callId, isMuted, isSpeakerOn} = useSelector(
    (state) => state.call,
  );

  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [audioConnected, setAudioConnected] = useState(false);
  const [webrtcInitialized, setWebrtcInitialized] = useState(false);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'connected') {
        handleEndCall();
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

  // Vibration and animations for ringing
  useEffect(() => {
    if (status === 'ringing') {
      const pattern = [0, 400, 200, 400, 200, 400];
      const vibrationInterval = setInterval(() => {
        Vibration.vibrate(pattern);
      }, 1800);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {toValue: 1.2, duration: 700, useNativeDriver: true}),
          Animated.timing(pulseAnim, {toValue: 1, duration: 700, useNativeDriver: true}),
        ]),
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {toValue: 1, duration: 600, useNativeDriver: true}),
          Animated.timing(ringAnim, {toValue: 0, duration: 600, useNativeDriver: true}),
        ]),
      ).start();

      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

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
      console.log('📞 IncomingCall: Call connected, starting timer');
      
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
      console.log(`📞 IncomingCall: Earned ${earned} coins (total: ${coinsEarned + earned})`);
    }
  }, [duration, status, dispatch, user?.coins]);

  // Handle call status changes
  useEffect(() => {
    if (status === 'ended') {
      Vibration.cancel();
      webRTCService.cleanup();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const timeout = setTimeout(() => {
        dispatch(resetCall());
        navigation.goBack();
      }, 2500);
      
      return () => clearTimeout(timeout);
    }
  }, [status, dispatch, navigation]);

  useEffect(() => {
    if (status === 'idle' && !remoteUser) {
      navigation.goBack();
    }
  }, [status, remoteUser, navigation]);

  const handleAnswer = useCallback(async () => {
    console.log('📞 IncomingCall: Answering call:', callId);
    Vibration.cancel();
    
    // Request permissions
    const permissions = await requestCallPermissions();
    if (!permissions.microphone) {
      Alert.alert('Microphone Required', 'Cannot answer calls without microphone access.');
      return;
    }

    // Setup WebRTC
    webRTCService.setSocketService(socketService);
    
    webRTCService.setCallbacks({
      onRemoteStream: (stream) => {
        console.log('📞 IncomingCall: Remote audio stream received');
        setAudioConnected(true);
      },
      onConnectionStateChange: (state) => {
        console.log('📞 IncomingCall: Connection state:', state);
        if (state === 'connected' || state === 'completed') {
          setAudioConnected(true);
        }
      },
      onCallConnected: () => {
        console.log('📞 IncomingCall: Call connected via WebRTC');
        setAudioConnected(true);
        Vibration.vibrate(100);
      },
      onCallEnded: (reason) => {
        console.log('📞 IncomingCall: Call ended:', reason);
        handleEndCall(reason);
      },
    });

    // Initialize as receiver (wait for offer)
    const callerId = remoteUser?._id;
    if (callerId) {
      console.log('📞 IncomingCall: Initializing WebRTC as receiver');
      const initialized = await webRTCService.initializeAsReceiverCall(callerId, callId);
      setWebrtcInitialized(initialized);
    }

    // Notify server that we're answering
    const success = socketService.answerCall(callId);
    
    if (success) {
      dispatch(callAnswered({callId}));
      
      // The actual callConnected will be dispatched when WebRTC establishes connection
      // But we set a fallback just in case
      setTimeout(() => {
        if (status !== 'connected') {
          dispatch(callConnected());
        }
      }, 2000);
    } else {
      Alert.alert('Error', 'Failed to answer call. Please try again.');
    }
  }, [callId, remoteUser, dispatch, status]);

  const handleDecline = useCallback(() => {
    console.log('📞 IncomingCall: Declining call:', callId);
    Vibration.cancel();
    
    socketService.rejectCall(callId);
    dispatch(endCall({reason: 'declined'}));
  }, [callId, dispatch]);

  const handleEndCall = useCallback((reason = 'user_ended') => {
    console.log('📞 IncomingCall: Ending call:', callId);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    webRTCService.cleanup();
    socketService.endCall(callId);
    dispatch(endCall({reason, duration, coinsEarned}));
  }, [callId, duration, coinsEarned, dispatch]);

  const handleToggleMute = useCallback(() => {
    const newMuteState = webRTCService.toggleMute();
    dispatch(toggleMute());
  }, [dispatch]);

  const handleToggleSpeaker = useCallback(() => {
    const newSpeakerState = webRTCService.toggleSpeaker();
    dispatch(toggleSpeaker());
  }, [dispatch]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (status) {
      case 'ringing':
        return 'Incoming Call';
      case 'connecting':
        return webrtcInitialized ? 'Connecting Audio...' : 'Connecting...';
      case 'connected':
        return audioConnected ? 'Connected' : 'Connecting Audio...';
      case 'ended':
        return 'Call Ended';
      default:
        return '';
    }
  };

  const answerButtonScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const slideTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const renderRingingControls = () => (
    <Animated.View style={[styles.ringingControls, {transform: [{translateY: slideTranslate}]}]}>
      <Text style={styles.swipeHint}>Tap to answer or decline</Text>
      
      <View style={styles.buttonsRow}>
        <TouchableOpacity onPress={handleDecline} activeOpacity={0.8}>
          <LinearGradient colors={['#ff416c', '#ff4b2b']} style={styles.actionButton}>
            <Icon name="phone-hangup" size={32} color={COLORS.white} />
          </LinearGradient>
          <Text style={styles.actionLabel}>Decline</Text>
        </TouchableOpacity>

        <Animated.View style={{transform: [{scale: answerButtonScale}]}}>
          <TouchableOpacity onPress={handleAnswer} activeOpacity={0.8}>
            <LinearGradient colors={['#11998e', '#38ef7d']} style={styles.actionButton}>
              <Icon name="phone" size={32} color={COLORS.white} />
            </LinearGradient>
            <Text style={[styles.actionLabel, {color: COLORS.success}]}>Answer</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );

  const renderConnectedControls = () => (
    <View style={styles.connectedControls}>
      <View style={styles.earningsDisplay}>
        <Icon name="circle-multiple" size={18} color={COLORS.accent} />
        <Text style={styles.earningsText}>+{formatNumber(coinsEarned)} earned</Text>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity onPress={handleToggleMute} style={styles.controlButton} activeOpacity={0.7}>
          <View style={[styles.controlIconBg, isMuted && styles.controlIconBgActive]}>
            <Icon
              name={isMuted ? 'microphone-off' : 'microphone'}
              size={26}
              color={isMuted ? COLORS.white : COLORS.text}
            />
          </View>
          <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleToggleSpeaker} style={styles.controlButton} activeOpacity={0.7}>
          <View style={[styles.controlIconBg, isSpeakerOn && styles.controlIconBgActive]}>
            <Icon
              name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
              size={26}
              color={isSpeakerOn ? COLORS.white : COLORS.text}
            />
          </View>
          <Text style={[styles.controlLabel, isSpeakerOn && styles.controlLabelActive]}>
            Speaker
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => handleEndCall('user_ended')} activeOpacity={0.8} style={styles.endCallWrapper}>
        <LinearGradient colors={['#ff416c', '#ff4b2b']} style={styles.endCallButton}>
          <Icon name="phone-hangup" size={32} color={COLORS.white} />
        </LinearGradient>
        <Text style={styles.endCallLabel}>End Call</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEndedSummary = () => (
    <View style={styles.endedSummary}>
      <Icon name="check-circle" size={50} color={COLORS.success} />
      <Text style={styles.summaryTitle}>Call Ended</Text>
      <Text style={styles.summaryDuration}>Duration: {formatDuration(duration)}</Text>
      {coinsEarned > 0 && (
        <View style={styles.summaryEarnings}>
          <Icon name="circle-multiple" size={22} color={COLORS.accent} />
          <Text style={styles.summaryEarningsText}>+{formatNumber(coinsEarned)} coins earned!</Text>
        </View>
      )}
    </View>
  );

  const ringIconOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <LinearGradient
      colors={status === 'ringing' ? ['#1a1a2e', '#16213e', '#0f3460'] : [COLORS.background, '#1a1a2e', COLORS.surface]}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {status === 'ended' ? (
            renderEndedSummary()
          ) : (
            <>
              {status === 'ringing' && (
                <View style={styles.incomingIndicator}>
                  <Animated.View style={{opacity: ringIconOpacity}}>
                    <Icon name="phone-incoming" size={24} color={COLORS.success} />
                  </Animated.View>
                  <Text style={styles.incomingText}>Incoming Voice Call</Text>
                </View>
              )}

              <Animated.View style={[styles.avatarWrapper, {transform: [{scale: pulseAnim}]}]}>
                <View style={styles.avatarContainer}>
                  {status === 'ringing' && (
                    <>
                      <Animated.View style={[styles.ringOuter, {opacity: ringIconOpacity}]} />
                      <Animated.View style={[styles.ringMiddle, {opacity: ringIconOpacity}]} />
                    </>
                  )}
                  
                  <Avatar name={remoteUser?.name} imageUrl={remoteUser?.profileImage} size={130} />
                  
                  {status === 'connected' && audioConnected && (
                    <View style={styles.connectedBadge}>
                      <Icon name="phone-in-talk" size={18} color={COLORS.white} />
                    </View>
                  )}
                </View>
              </Animated.View>

              <Text style={styles.userName}>{remoteUser?.name || 'Unknown Caller'}</Text>
              <Text style={styles.statusText}>{getStatusText()}</Text>

              {status === 'connected' && (
                <View style={styles.timerSection}>
                  <Text style={styles.timerText}>{formatDuration(duration)}</Text>
                  <View style={styles.rateIndicator}>
                    <Icon name="trending-up" size={14} color={COLORS.success} />
                    <Text style={styles.rateText}>Earning {CALL_RATES.coinsPerMinute} coins/min</Text>
                  </View>
                </View>
              )}

              {status === 'connected' && audioConnected && (
                <View style={styles.audioQuality}>
                  <View style={styles.qualityDot} />
                  <Text style={styles.qualityText}>Audio Connected</Text>
                </View>
              )}
            </>
          )}
        </View>

        {status === 'ringing' && renderRingingControls()}
        {(status === 'connected' || status === 'connecting') && renderConnectedControls()}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  safeArea: {flex: 1},
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  incomingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xl,
  },
  incomingText: {
    fontSize: FONTS.base,
    color: COLORS.success,
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
  avatarWrapper: {marginBottom: SPACING.lg},
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  ringMiddle: {
    position: 'absolute',
    width: 175,
    height: 175,
    borderRadius: 87.5,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.6)',
  },
  connectedBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 40,
    height: 40,
    borderRadius: 20,
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
  statusText: {fontSize: FONTS.lg, color: COLORS.textSecondary},
  timerSection: {alignItems: 'center', marginTop: SPACING.xl},
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  rateIndicator: {flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs},
  rateText: {fontSize: FONTS.sm, color: COLORS.success, marginLeft: 4},
  audioQuality: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: SPACING.xs,
  },
  qualityText: {fontSize: FONTS.sm, color: COLORS.textSecondary},
  ringingControls: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  swipeHint: {fontSize: FONTS.sm, color: COLORS.textMuted, marginBottom: SPACING.lg},
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: SPACING.xl,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  actionLabel: {
    fontSize: FONTS.sm,
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
  connectedControls: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  earningsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.lg,
  },
  earningsText: {
    fontSize: FONTS.base,
    color: COLORS.accent,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  controlButton: {alignItems: 'center', marginHorizontal: SPACING.lg},
  controlIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  controlIconBgActive: {backgroundColor: COLORS.primary},
  controlLabel: {fontSize: FONTS.xs, color: COLORS.textSecondary},
  controlLabelActive: {color: COLORS.primary},
  endCallWrapper: {alignItems: 'center'},
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  endCallLabel: {
    fontSize: FONTS.sm,
    color: COLORS.danger,
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
  endedSummary: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.xl,
  },
  summaryTitle: {fontSize: FONTS.xxl, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md},
  summaryDuration: {fontSize: FONTS.base, color: COLORS.textSecondary, marginTop: SPACING.xs},
  summaryEarnings: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
  },
  summaryEarningsText: {
    fontSize: FONTS.base,
    color: COLORS.accent,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
});

export default IncomingCallScreen;